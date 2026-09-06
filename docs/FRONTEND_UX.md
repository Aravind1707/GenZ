# Frontend UX direction

The staff frontend is being organized around task-focused workspaces instead of large pages containing unrelated operational forms.

## Inventory information architecture

- Overview — health, valuation, low stock and quick actions
- Stock — quantities, reorder levels and adjustments
- Suppliers — supplier records
- Receive — incoming batches, cost and expiry
- Stocktake — physical counts and approval
- History — movement and purchase audit
- COGS — cost reporting
- Recipes — material usage per menu item

The dashboard also exposes customer check-in/check-out flow over the last 24 hours, including peak entry and exit windows.

## UX principles

- One page should answer one operational question.
- High-risk actions remain explicit and separate from read-only views.
- Live data is labelled and refreshed without page navigation.
- Tables scroll horizontally instead of collapsing into unreadable mobile layouts.
- Empty, loading and error states are visible instead of silently blank.
- Staff and customer experiences should remain visually distinct while sharing the same design tokens.
