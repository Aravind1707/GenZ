# GenZ OS — MySQL LAN deployment

## Target architecture

- The **admin PC** runs the GenZ OS web server and the permanent MySQL database.
- Café clients connect only to the GenZ web server over the LAN.
- MySQL should remain local to the admin PC; café PCs/phones should never connect directly to port 3306.
- Database credentials stay in the admin PC's `.env.local` and are never exposed to browser code.

## 1. Install MySQL

Install a supported MySQL 8.x server on the admin PC and create the database using `db/mysql-schema.sql`.

Then run `db/mysql-setup.sql` as a MySQL administrator after replacing its placeholder password.

## 2. Configure GenZ

Copy `.env.example` to `.env.local` and set:

- `GENZ_DB_HOST=127.0.0.1`
- `GENZ_DB_PORT=3306`
- `GENZ_DB_NAME=genz_os`
- `GENZ_DB_USER=genz_app`
- `GENZ_DB_PASSWORD=<the same long random password created in MySQL>`

Do not prefix database variables with `NEXT_PUBLIC_`.

## 3. Network exposure

The Next.js server is the only service that should be reachable by café clients. Configure the Windows firewall to allow the GenZ web-server port on the **private/LAN network only**.

Do not create an inbound firewall rule for MySQL TCP/3306.

If remote MySQL administration is required, use a controlled administrative path rather than exposing 3306 to the café LAN.

## 4. Database permissions

The runtime `genz_app` account is deliberately limited to `SELECT`, `INSERT`, `UPDATE`, and `DELETE`. It should not be able to create databases, users, or alter the schema.

Schema installation and future migrations must use a separate administrator account.

## 5. Backups

A permanent database is not a backup. Before production use, configure an automated MySQL dump/backup to storage separate from the live database disk and periodically verify that a backup can actually be restored.

## 6. Failure behavior

The application is designed so session, booking, and food-order mutations use MySQL transactions. If the web process crashes during a transaction, MySQL can roll back the incomplete transaction. LAN operation still depends on the admin PC and its local MySQL service being available.

For true café resilience, the next hardening phase will add startup health checks, backup verification, financial audit records, idempotent payments, and recovery tooling.
