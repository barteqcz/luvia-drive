import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import multer from "multer";
import { randomUUID } from "node:crypto";
import archiver from "archiver";
import db from "./src/server/db.ts";
import { authenticate, generateToken, isAdmin } from "./src/server/auth.ts";
import type { AuthRequest } from "./src/server/auth.ts";

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const getStorage = (userId: string) => {
    const userDir = path.join(DATA_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    const trashDir = path.join(userDir, '.trash');
    if (!fs.existsSync(trashDir)) {
      fs.mkdirSync(trashDir, { recursive: true });
    }
    return userDir;
  };

  const storage = multer.diskStorage({
    destination: (req: AuthRequest, file, cb) => {
      const userId = req.user?.id;
      if (!userId) return cb(new Error("No user ID"), "");
      const userDir = getStorage(userId);
      const subpath = (req.query.path as string) || "";
      const targetDir = path.join(userDir, subpath);
      
      if (!targetDir.startsWith(userDir)) {
        return cb(new Error("Invalid path"), "");
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });

  const upload = multer({ storage });

  // API Routes
  app.get("/api/setup/status", (req, res) => {
    const usersCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
    res.json({ needsSetup: usersCount.count === 0 });
  });

  app.post("/api/setup/register", (req, res) => {
    const usersCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
    if (usersCount.count > 0) {
      return res.status(403).json({ error: "Setup already completed" });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    try {
      const id = randomUUID();
      const hashedPassword = bcrypt.hashSync(password, 10);
      const quota = 10 * 1024 * 1024 * 1024; // 10GB
      db.prepare('INSERT INTO users (id, username, password, role, quota) VALUES (?, ?, ?, ?, ?)').run(
        id,
        username,
        hashedPassword,
        'admin',
        quota
      );
      res.json({ success: true });
    } catch (_err: any) {
      res.status(500).json({ error: "Failed to create administrator account" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = generateToken({ id: user.id, username: user.username, role: user.role, quota: user.quota });
    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ id: user.id, username: user.username, role: user.role, quota: user.quota });
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/me", authenticate, (req: AuthRequest, res) => {
    const user = db.prepare('SELECT id, username, role, quota FROM users WHERE id = ?').get(req.user?.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  // User Management (Admin Only)
  app.post("/api/admin/users", authenticate, isAdmin, (req, res) => {
    const { username, password, role, quota } = req.body;
    try {
      const id = randomUUID();
      const hashed = bcrypt.hashSync(password, 10);
      const userQuota = quota !== undefined ? parseInt(quota) : 10737418240; // Default 10GB
      db.prepare('INSERT INTO users (id, username, password, role, quota) VALUES (?, ?, ?, ?, ?)').run(id, username, hashed, role || 'user', userQuota);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/admin/users", authenticate, isAdmin, (req, res) => {
    const users = db.prepare('SELECT id, username, role, quota, created_at FROM users').all();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", authenticate, isAdmin, (req, res) => {
    const { id } = req.params;
    const { role, quota } = req.body;
    try {
      if (role !== undefined && quota !== undefined) {
        db.prepare('UPDATE users SET role = ?, quota = ? WHERE id = ?').run(role, parseInt(quota), id);
      } else if (role !== undefined) {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
      } else if (quota !== undefined) {
        db.prepare('UPDATE users SET quota = ? WHERE id = ?').run(parseInt(quota), id);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", authenticate, isAdmin, (req, res) => {
    const { id } = req.params;
    try {
      // Prevent deleting self
      if (id === (req as any).user.id) {
        return res.status(400).json({ error: "You cannot delete your own account" });
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      
      // Physically delete user files
      const userDir = path.join(DATA_DIR, id);
      if (fs.existsSync(userDir)) {
        fs.rmSync(userDir, { recursive: true, force: true });
      }

      res.json({ success: true });
    } catch (_err: any) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // File Routes
  app.get("/api/usage", authenticate, (req: AuthRequest, res) => {
    const userDir = getStorage(req.user!.id);
    const user = db.prepare('SELECT quota FROM users WHERE id = ?').get(req.user!.id) as { quota: number };
    
    let totalSize = 0;
    const calculateSize = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          calculateSize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    };
    
    if (fs.existsSync(userDir)) {
      calculateSize(userDir);
    }
    
    res.json({ used: totalSize, quota: (user && user.quota !== undefined) ? user.quota : -1 });
  });

  app.get("/api/files", authenticate, (req: AuthRequest, res) => {
    const userDir = getStorage(req.user!.id);
    const subpath = (req.query.path as string) || "";
    const targetDir = path.join(userDir, subpath);

    // Security: Ensure path is within user directory
    if (!targetDir.startsWith(userDir)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ error: "Directory not found" });
    }

    const files = fs.readdirSync(targetDir)
      .filter(name => name !== ".trash") // Hide trash directory
      .map(name => {
        const stats = fs.statSync(path.join(targetDir, name));
        return {
          name,
          size: stats.size,
          type: stats.isDirectory() ? 'directory' : 'file',
          updatedAt: stats.mtime
        };
      });
    res.json(files);
  });

  app.post("/api/files/upload", authenticate, (req: AuthRequest, res, next) => {
    // Preliminary quota check before multer processes the entire request
    const user = db.prepare('SELECT quota FROM users WHERE id = ?').get(req.user!.id) as { quota: number };
    if (!user || user.quota === -1) return next();

    const userDir = getStorage(req.user!.id);
    let totalSize = 0;
    const calculateSize = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) calculateSize(itemPath);
        else totalSize += stats.size;
      }
    };
    calculateSize(userDir);

    // Content length check (approximation for incoming total file size)
    const incomingSize = parseInt(req.headers['content-length'] || '0');
    if (totalSize + incomingSize > user.quota) {
      return res.status(413).json({ error: "Disk quota exceeded" });
    }
    next();
  }, upload.array("files"), (req, res) => {
    res.json({ success: true });
  });

  app.post("/api/files/mkdir", authenticate, (req: AuthRequest, res) => {
    const userDir = getStorage(req.user!.id);
    const { name, path: subpath } = req.body;
    
    if (!name || !name.match(/^[a-zA-Z0-9_\-\s.]+$/)) {
      return res.status(400).json({ error: "Invalid gallery name" });
    }

    const targetDir = path.join(userDir, subpath || "", name);
    
    if (!targetDir.startsWith(userDir)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (fs.existsSync(targetDir)) {
      return res.status(400).json({ error: "Folder already exists" });
    }

    try {
      fs.mkdirSync(targetDir, { recursive: true });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/files/download/*", authenticate, (req: AuthRequest, res) => {
    const userDir = getStorage(req.user!.id);
    const relativePath = decodeURIComponent(req.params[0]);
    const filePath = path.join(userDir, relativePath);

    if (!fs.existsSync(filePath) || !filePath.startsWith(userDir)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.download(filePath);
  });

  app.delete("/api/files/*", authenticate, (req: AuthRequest, res) => {
    const userDir = getStorage(req.user!.id);
    const relativePath = decodeURIComponent(req.params[0]);
    const filePath = path.join(userDir, relativePath);

    if (!fs.existsSync(filePath) || !filePath.startsWith(userDir)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    // Move to trash instead of direct deletion
    const fileName = path.basename(relativePath);
    const trashDir = path.join(userDir, '.trash');
    const trashId = randomUUID();
    const stats = fs.statSync(filePath);
    const storageName = `${trashId}-${fileName}`;
    const trashPath = path.join(trashDir, storageName);
    
    fs.renameSync(filePath, trashPath);
    
    db.prepare('INSERT INTO trash (id, owner_id, original_name, storage_name, size) VALUES (?, ?, ?, ?, ?)')
      .run(trashId, req.user!.id, relativePath, storageName, stats.size);
      
    res.json({ success: true });
  });

  // Trash Routes
  app.get("/api/trash", authenticate, (req: AuthRequest, res) => {
    // Auto-cleanup: items older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const expired = db.prepare('SELECT * FROM trash WHERE owner_id = ? AND deleted_at < ?').all(req.user!.id, thirtyDaysAgo) as any[];
    
    const userDir = getStorage(req.user!.id);
    expired.forEach(item => {
      const p = path.join(userDir, '.trash', item.storage_name);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
      db.prepare('DELETE FROM trash WHERE id = ?').run(item.id);
    });

    const items = db.prepare('SELECT * FROM trash WHERE owner_id = ? ORDER BY deleted_at DESC').all(req.user!.id);
    res.json(items);
  });

  app.post("/api/trash/restore/:id", authenticate, (req: AuthRequest, res) => {
    const item = db.prepare('SELECT * FROM trash WHERE id = ? AND owner_id = ?').get(req.params.id, req.user!.id) as any;
    if (!item) return res.status(404).json({ error: "Item not found in trash" });

    const userDir = getStorage(req.user!.id);
    const trashPath = path.join(userDir, '.trash', item.storage_name);
    const restorePath = path.join(userDir, item.original_name);

    if (fs.existsSync(trashPath)) {
      // If file already exists, append a timestamp to avoid overwrite or error
      let finalRestorePath = restorePath;
      if (fs.existsSync(restorePath)) {
        finalRestorePath = path.join(userDir, `${Date.now()}-${item.original_name}`);
      }
      fs.renameSync(trashPath, finalRestorePath);
    }
    
    db.prepare('DELETE FROM trash WHERE id = ?').run(item.id);
    res.json({ success: true });
  });

  app.delete("/api/trash/empty", authenticate, (req: AuthRequest, res) => {
    const userDir = getStorage(req.user!.id);
    const trashDir = path.join(userDir, '.trash');
    
    if (fs.existsSync(trashDir)) {
      fs.readdirSync(trashDir).forEach(file => {
        fs.rmSync(path.join(trashDir, file), { recursive: true, force: true });
      });
    }
    
    db.prepare('DELETE FROM trash WHERE owner_id = ?').run(req.user!.id);
    res.json({ success: true });
  });

  app.delete("/api/trash/:id", authenticate, (req: AuthRequest, res) => {
    const item = db.prepare('SELECT * FROM trash WHERE id = ? AND owner_id = ?').get(req.params.id, req.user!.id) as any;
    if (!item) return res.status(404).json({ error: "Item not found" });

    const userDir = getStorage(req.user!.id);
    const trashPath = path.join(userDir, '.trash', item.storage_name);
    
    if (fs.existsSync(trashPath)) {
      fs.rmSync(trashPath, { recursive: true, force: true });
    }
    
    db.prepare('DELETE FROM trash WHERE id = ?').run(item.id);
    res.json({ success: true });
  });

  // Sharing
  app.post("/api/files/share", authenticate, (req: AuthRequest, res) => {
    const { name, expiresAfter, downloadLimit } = req.body;
    try {
      if (!name) {
        return res.status(400).json({ error: "File name is required" });
      }

      const token = randomUUID();
      const shareId = randomUUID();
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User context missing" });
      }

      let expiresAt: string | null = null;
      if (expiresAfter && expiresAfter !== 'never') {
        const hours = parseInt(expiresAfter);
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }

      db.prepare('INSERT INTO shares (id, owner_id, file_path, share_token, expires_at, download_limit) VALUES (?, ?, ?, ?, ?, ?)').run(
        shareId,
        userId,
        name,
        token,
        expiresAt,
        downloadLimit === 0 ? null : downloadLimit
      );
      res.json({ share_link: `/s/${token}` });
    } catch (err: any) {
      console.error('Share error:', err);
      res.status(500).json({ error: `Failed to create share link: ${err.message}` });
    }
  });

  app.get("/api/share/info/:token", (req, res) => {
    const share = db.prepare('SELECT * FROM shares WHERE share_token = ?').get(req.params.token) as any;
    if (!share) return res.status(404).json({ error: "Link expired or invalid" });

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: "This share link has expired" });
    }

    // Check download limit
    if (share.download_limit !== null && share.download_count >= share.download_limit) {
      return res.status(410).json({ error: "Download limit reached for this link" });
    }

    const userDir = path.join(DATA_DIR, share.owner_id);
    const filePath = path.join(userDir, share.file_path);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File no longer available" });
    
    const stats = fs.statSync(filePath);
    let totalSize = stats.size;

    if (stats.isDirectory()) {
      totalSize = 0;
      const calcDirSize = (dir: string) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const s = fs.statSync(itemPath);
          if (s.isDirectory()) calcDirSize(itemPath);
          else totalSize += s.size;
        }
      };
      calcDirSize(filePath);
    }

    res.json({ 
      name: path.basename(share.file_path), 
      size: totalSize,
      is_directory: stats.isDirectory()
    });
  });

  app.get("/api/share/download/:token", (req, res) => {
    const share = db.prepare('SELECT * FROM shares WHERE share_token = ?').get(req.params.token) as any;
    if (!share) return res.status(404).send("Link expired or invalid");

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).send("This share link has expired");
    }

    // Check download limit
    if (share.download_limit !== null && share.download_count >= share.download_limit) {
      return res.status(410).send("Download limit reached for this link");
    }

    const userDir = path.join(DATA_DIR, share.owner_id);
    const filePath = path.join(userDir, share.file_path);

    if (!fs.existsSync(filePath)) return res.status(404).send("File no longer available");

    // Increment download count
    db.prepare('UPDATE shares SET download_count = download_count + 1 WHERE id = ?').run(share.id);

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      res.attachment(`${path.basename(share.file_path)}.zip`);
      archive.pipe(res);
      archive.directory(filePath, false);
      archive.finalize();
    } else {
      res.download(filePath, path.basename(share.file_path));
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL ERROR DURING SERVER STARTUP:");
  console.error(err);
  process.exit(1);
});
