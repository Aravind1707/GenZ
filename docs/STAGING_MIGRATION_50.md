# Staging Migration 50 Verification

The staging health endpoint previously reported `latestMigration: 48` while migration 049 was already present in `main`. The staging container therefore needs to be rebuilt from the current repository so its entrypoint can execute migrations 049 and 050.

Migration 050 makes `membership_transactions.new_expires_at` nullable for the single-membership model and records schema version 50.

## Safe staging procedure

```powershell
docker compose -f docker-compose.test.yml down -v --remove-orphans
docker compose -f docker-compose.test.yml build --no-cache
docker compose -f docker-compose.test.yml up -d
docker compose -f docker-compose.test.yml ps
Invoke-RestMethod http://localhost:3001/api/health
docker compose -f docker-compose.test.yml logs --tail=300 app
```

Do not run the `down -v` command against production.

## Expected result

`/api/health` should report the current migration version, `50`, and database readiness should be true before application acceptance testing begins.
