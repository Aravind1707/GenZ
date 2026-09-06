# GenZ Gaming Cafe OS — Owner's Manual

This manual is the operational guide for the GenZ Gaming Cafe OS. It covers the current application modules, who should use them, the normal operating sequence, configuration, membership, gaming, food, inventory, payments, finance, staff access, developer controls, audit logs, station agents, backup/recovery expectations, and troubleshooting.

## 1. Access model

### Owner
The Owner is the highest-privilege operational account. Owners can configure the catalogue and gaming prices, manage staff, manage memberships, access finance, and use the Developer Console.

### Manager
Managers operate day-to-day cafe functions permitted by the RBAC policy: sessions, bookings, orders, members, inventory and approved finance/payment workflows. They cannot access owner-only administration or developer controls.

### Developer
Developer accounts are intended for engineering/maintenance work. They can inspect operational areas needed for diagnosis and use the Developer Console to control feature flags and inspect audit logs. They are not owners and should not be given unnecessary financial or configuration authority.

Never share an Owner password with a developer. Create a separate named Developer account.

## 2. Daily opening procedure

1. Start the MySQL/database service and GenZ application.
2. Open the staff login page.
3. Sign in with the named staff account.
4. Open Dashboard and verify system health, customer flow, active sessions, kitchen queue and station state.
5. Open Stations and verify every physical station that should be available is AVAILABLE.
6. Check Inventory for low-stock materials and food items.
7. Check the menu/customer pricing before accepting orders.
8. Verify payment/provider integrations if enabled.
9. If a station is under repair, leave it in MAINTENANCE or BLOCKED rather than allowing bookings.

## 3. Dashboard

The Dashboard is the operational control room.

Use it to see:
- customer flow and hourly movement;
- check-ins and check-outs;
- arrivals/departures;
- peak entry and exit periods;
- occupancy and active sessions;
- live station/floor state;
- kitchen queue;
- current operational KPIs.

Use the dashboard for monitoring, not for manually editing historical financial records.

## 4. Stations

Stations represent physical gaming resources.

Current equipment model:
- PC-01 to PC-10: premium 240Hz PCs;
- PC-11 to PC-20: normal 165Hz PCs;
- PS5-A to PS5-E;
- PSVR-01 to PSVR-02;
- Moza F1 Sim-01 to 02.

Station statuses should be treated carefully:
- AVAILABLE — can be assigned;
- BOOKED — reserved for a booking;
- ACTIVE — currently in use;
- MAINTENANCE — temporarily unavailable for operational reasons;
- BLOCKED — deliberately prevented from use.

Do not mark a physically broken station AVAILABLE merely to clear an alert.

## 5. Gaming pricing

The cafe uses duration-based pricing packages and distinguishes regular and member prices.

### 240Hz PC / PS5 Multi
| Duration | Regular | Member |
|---|---:|---:|
| 1 hour | ₹120 | ₹90 |
| 2 hours | ₹240 | ₹140 |
| 3 hours | ₹360 | ₹180 |
| 4 hours | ₹480 | ₹240 |
| 5 hours | ₹600 | ₹300 |
| 6 hours | ₹720 | ₹360 |
| 7 hours | ₹840 | ₹420 |
| 8 hours | ₹960 | ₹480 |

### 165Hz PC / PS4 Multi
| Duration | Regular | Member |
|---|---:|---:|
| 1 hour | ₹90 | ₹80 |
| 2 hours | ₹180 | ₹130 |
| 3 hours | ₹270 | ₹160 |
| 4 hours | ₹360 | ₹230 |
| 5 hours | ₹450 | ₹290 |
| 6 hours | ₹540 | ₹330 |
| 7 hours | ₹630 | ₹390 |
| 8 hours | ₹720 | ₹400 |

### PS4 Solo
| Duration | Regular | Member |
|---|---:|---:|
| 1 hour | ₹120 | ₹100 |
| 2 hours | ₹240 | ₹190 |
| 3 hours | ₹360 | ₹280 |
| 4 hours | ₹480 | ₹370 |
| 5 hours | ₹600 | ₹460 |

### PS5 Solo
| Duration | Regular | Member |
|---|---:|---:|
| 1 hour | ₹150 | ₹120 |
| 2 hours | ₹300 | ₹210 |
| 3 hours | ₹450 | ₹300 |
| 4 hours | ₹600 | ₹390 |
| 5 hours | ₹750 | ₹480 |

### PS VR 2 Sim / Moza R5 F1 Sim
| Duration | Regular | Member |
|---|---:|---:|
| 30 min | ₹200 | ₹150 |
| 60 min | ₹400 | ₹250 |
| 90 min | ₹600 | ₹350 |

Multiple-player surcharge for these simulation packages is ₹50.

When changing prices, verify the package duration, station group, regular price, member price and extra-player surcharge together. Do not create duplicate packages accidentally.

## 6. Customer identity and OTP

Customers authenticate with their mobile number and OTP.

The customer identity model is intentionally simple:
- mobile number is the customer identity;
- membership recognition is attached to the customer/member record;
- there are no active membership tiers;
- new manually created memberships do not require an expiry date.

Production OTP should use the configured real OTP provider. Development/staging OTP behavior is deliberately restricted to staging configuration.

## 7. Membership management

Owners can create members with:
- membership ID in `GENZFAM###` format;
- customer name;
- mobile number;
- government ID type;
- government ID number.

Supported government-ID labels include Aadhaar, PAN, Passport, Driving Licence, Voter ID and Other.

Government ID information is sensitive. It should not be displayed in general member directories or casually exported. Only authorized personnel should access it for legitimate membership administration.

A newly created membership is non-expiring. Do not invent an expiry date merely because an older record has one.

## 8. Member vs non-member food pricing

Food and beverages are ordered through the customer website.

The pricing rules are server-authoritative. Never trust a price sent by the browser.

Members should see member pricing without exposing the normal price as the active customer price. Non-members can be shown the member price as an upsell/contrast according to the customer UI rules.

If an item is unavailable, the customer must not be able to add it or complete an order for it.

## 9. Food ordering

Normal customer flow:
1. Customer signs in with mobile/OTP.
2. Customer opens the food menu.
3. Customer selects available items.
4. The server recalculates membership price and stock availability.
5. The server creates the order with an idempotency key.
6. Kitchen receives the order.
7. Kitchen progresses the preparation state.
8. Completion/delivery is recorded.
9. Payment and receipt/finance records are reconciled according to the configured payment flow.

If a customer reports a wrong price, inspect membership recognition and the server-side order record before changing the menu price.

## 10. Kitchen

Kitchen staff should work from the kitchen queue rather than relying on customer screenshots.

For each order:
- confirm the order exists;
- confirm items and quantities;
- prepare in queue order according to cafe policy;
- update the order state only after the corresponding physical action;
- do not mark an order complete merely to remove it from the screen.

## 11. Inventory

Inventory includes:
- material/stock overview;
- stock movements;
- suppliers;
- receiving;
- stocktakes;
- history;
- COGS;
- recipes.

### Receiving
When stock arrives:
1. select the correct material;
2. select/record the supplier;
3. enter received quantity;
4. enter the appropriate cost information;
5. verify the resulting stock movement;
6. keep supporting supplier documents according to cafe policy.

### Waste
Record waste rather than silently changing stock. Include an appropriate reason/note where the workflow requires it.

### Stocktake
1. Open a stocktake.
2. Count physical stock.
3. Record the counted quantities.
4. Review differences.
5. Complete the stocktake.
6. Follow the configured approval workflow.

Do not use stock adjustments to hide unexplained shortages.

## 12. Sessions

A gaming session normally follows:
1. identify customer;
2. select/assign station;
3. select duration/package;
4. check member status;
5. start session;
6. monitor active session;
7. extend if requested and valid;
8. pause/end according to the actual operational event;
9. calculate the final gaming charge;
10. settle/payment and receipt.

The session start time is stored as a database-safe datetime. Do not manually alter timestamps to fix a UI display issue.

If a session fails to start, check:
- station status;
- station lock/concurrency state;
- customer/member identity;
- database connectivity;
- selected duration/package;
- existing active session for the station.

## 13. Bookings and check-in

Bookings reserve a station/time according to the configured booking workflow.

Before check-in:
- verify customer identity;
- verify booking time;
- verify station is still operational;
- verify there is no conflicting active assignment.

A booking should not silently overwrite an active session.

## 14. Payments

Payment records are operationally important and should be treated as immutable history wherever possible.

Always verify:
- amount;
- order/session/booking reference;
- payment method;
- provider reference when applicable;
- payment status;
- idempotency behavior;
- reconciliation state.

Never mark a payment successful merely because a customer says they paid. Use the configured payment evidence/provider flow.

## 15. Receipts

Receipts should represent the finalized business transaction. If a receipt looks incorrect:
1. inspect the source session/order;
2. inspect membership status used for pricing;
3. inspect payments;
4. inspect discounts/adjustments;
5. only then correct the underlying business record through the supported workflow.

Do not patch a receipt display as a substitute for fixing incorrect source data.

## 16. Finance and reconciliation

Finance covers settlements, reconciliation, provider reconciliation and daily close.

Daily close should only be performed after the operational day has been reviewed.

Before closing:
- review active sessions;
- review open orders;
- review payment failures/pending payments;
- review refunds/adjustments;
- review inventory/COGS anomalies;
- review cash/card/UPI/provider totals;
- resolve or explicitly document exceptions.

Once the business day is closed, treat it as an accounting record rather than an editable dashboard snapshot.

## 17. Staff management

Owner workflow:
1. open Admin;
2. create a named account;
3. choose Manager or Developer as appropriate;
4. use a unique strong password;
5. give only the minimum required access;
6. disable the account immediately when access is no longer required.

Never use a shared generic staff account for accountability-sensitive actions.

Disabling a staff account also invalidates its active staff sessions.

## 18. Developer Console

Open **Developer Console** from the Owner/Admin area or the Developer navigation.

The console contains two major areas.

### Feature switches
Each switch controls a named application capability, including:
- Dashboard;
- Sessions;
- Bookings;
- Food Orders;
- Kitchen;
- Inventory;
- Finance;
- Payments;
- Members;
- Stations;
- Receipts;
- Staff Management;
- Admin Configuration;
- Customer Portal;
- Station Agent;
- OTP;
- Audit Logs.

Use a switch when a feature needs temporary operational containment or maintenance. Disabling a feature does **not** delete its database records.

Recommended procedure:
1. identify the incident/maintenance reason;
2. disable only the affected capability;
3. verify the user-facing behavior;
4. perform the maintenance;
5. re-enable the capability;
6. verify the end-to-end flow;
7. record the incident/change reference if your operational process has one.

Do not repeatedly toggle production features as a test. Use staging for experimentation.

### Audit log
The Developer Console displays recent audit events with:
- timestamp;
- actor name/username;
- actor role;
- action;
- entity type;
- entity ID;
- structured details.

Feature enable/disable operations are explicitly attributed to the signed-in staff account.

## 19. Audit and accountability

The system already records important owner/staff mutations through the audit subsystem. Examples include menu changes, rate changes, station changes, staff changes, inventory authorization and feature-switch changes.

When investigating an incident, correlate:
1. audit event;
2. affected entity ID;
3. session/order/payment/booking record;
4. application timestamp;
5. database timestamp;
6. staff account.

Do not delete audit records to clean up a UI mistake.

## 20. Developer troubleshooting checklist

### Application is unavailable
- check application process/container;
- check `/api/health`;
- check database health;
- check environment variables;
- inspect application logs;
- confirm migrations completed.

### Database migration failure
- do not manually mark a migration as applied;
- inspect the migration error;
- confirm the previous migration completed;
- verify database permissions;
- verify the schema migration version;
- rerun through the supported migration runner after fixing the cause.

### Wrong member price
- verify mobile identity;
- verify active member record;
- verify nullable/non-expiring membership semantics;
- verify selected package/menu item;
- verify server-side calculation;
- inspect order/session record.

### Wrong gaming charge
- verify station group;
- verify duration;
- verify regular/member status;
- verify extra-player surcharge;
- verify session start/end/extension events;
- verify package configuration.

### Food order says available but checkout fails
- inspect stock;
- inspect concurrent orders;
- inspect inventory reservation/decrement transaction;
- inspect idempotency key;
- inspect transaction rollback.

### Session start datetime error
The application should pass database-safe date values at the MySQL boundary. ISO API serialization such as `2026-09-06T17:22:16.547Z` is appropriate for an API response but must not be blindly inserted as a DATETIME string. The centralized database layer normalizes ISO timestamp parameters.

## 21. Staging vs production

Always validate major changes in isolated staging first.

Staging should use:
- its own MySQL database/container;
- staging-only OTP development behavior;
- staging-only test seed data;
- localhost binding where appropriate;
- no production payment credentials;
- no production customer/member data.

Do not copy staging test credentials into production.

## 22. Production change procedure

For a significant application/database change:
1. make the change in source control;
2. run integrity/QA/unit checks;
3. run the production build;
4. run isolated staging migration;
5. run MySQL integration tests;
6. exercise the affected end-to-end flow;
7. verify logs/audit behavior;
8. review the migration for idempotency and rollback implications;
9. deploy during an appropriate maintenance window;
10. verify health and core workflows;
11. keep the change record.

## 23. Emergency containment

If a feature is causing an active production incident:
1. use the Developer Console to disable only the affected feature if the switch is appropriate;
2. preserve audit evidence;
3. do not delete business data;
4. isolate the cause in staging;
5. deploy the correction;
6. re-enable the feature;
7. verify the entire workflow, not just the page that failed.

## 24. Security rules

- Never expose passwords, password hashes, OTP provider secrets, payment secrets or webhook secrets in the UI.
- Never put government ID values into general-purpose logs.
- Never trust browser-provided prices or membership status.
- Keep production database credentials out of source control.
- Use named staff accounts.
- Disable departed staff immediately.
- Give developers only the permissions they need.
- Treat audit records as security/accounting evidence.
- Use staging for destructive testing.

## 25. Quick operating map

**Customer:** OTP → pricing → booking/session → food → payment → receipt.

**Floor:** booking/check-in → station assignment → session start → extend/pause/end → settlement.

**Kitchen:** order → queue → preparation → completion/delivery → inventory impact.

**Inventory:** receiving → stock → recipe/consumption → waste/adjustment → stocktake → COGS.

**Finance:** payments → settlements → reconciliation → provider reconciliation → daily close.

**Administration:** membership → menu → gaming rates/packages → stations → staff.

**Engineering:** staging → migrations → integration tests → production build → deployment → health/audit verification.

## 26. Golden rule

When something looks wrong, **do not fix the display first**. Trace the business event from customer/staff action → API → transaction → database → downstream module → receipt/finance. Correct the source of truth and then verify every dependent module.
