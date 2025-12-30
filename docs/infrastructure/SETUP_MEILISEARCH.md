# Meilisearch Setup (Server)

This guide explains how to install and run **Meilisearch** on an Ubuntu server.

---

## Prerequisites

- Ubuntu server
- SSH access
- `curl` installed
- Non-root user (recommended)

---

## 1. SSH into the Server

```bash
ssh ubuntu@<server-ip>
```

After login, you should be in the Ubuntu shell.

---

## 2. Install Meilisearch

Run the official installation script:

```bash
curl -L https://install.meilisearch.com | sh
```

This downloads the `meilisearch` binary into the current directory.

---

## 3. First-Time Run (Generate Master Key)

Start Meilisearch once manually:

```bash
./meilisearch
```

On first launch:

- Meilisearch will **generate a master key**
- The key will be printed in the terminal

📌 **Save this key securely**. It is required for all admin operations.

Stop the process after noting the key.

---

## 4. Run with Master Key

Restart Meilisearch using the master key:

```bash
./meilisearch --master-key <YOUR_MASTER_KEY>
```

At this point, Meilisearch is running but **not** in the background.

---

## 5. Run Meilisearch as a Service (Recommended)

For production use, Meilisearch should be managed by `systemd`.

### Key Points

- Use a **dedicated service user** (for example: `meili`)
- Do **not** run Meilisearch as `root`

### Typical systemd Setup Includes:

- `ExecStart` pointing to the Meilisearch binary
- `--db-path` for persistent data (required if you manually set the db path)
- `--master-key` for authentication
- Automatic restarts on failure

Once configured, Meilisearch will:

- Start automatically on server boot
- Restart if it crashes
- Run silently in the background

---

## 6. Verifying the Service

After enabling the service:

```bash
systemctl status meilisearch
```

If running correctly, the service should show as **active (running)**.

---

## Notes & Best Practices

- Keep the master key **private**
- Restrict network access to Meilisearch (firewall / reverse proxy)
- Backup the database directory regularly
- Never commit the master key to version control

---

## Useful Commands

```bash
# Start service
sudo systemctl start meilisearch

# Stop service
sudo systemctl stop meilisearch

# Restart service
sudo systemctl restart meilisearch

# View logs
journalctl -u meilisearch -f
```
