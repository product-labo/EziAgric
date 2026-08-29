# Navigation Components

This directory contains shared navigation components used throughout the application.

## Components

### Breadcrumb

A breadcrumb navigation component that shows the user's current location in the site hierarchy.

**Features:**
- Displays hierarchical navigation path
- Supports optional admin action links
- Accessible with proper ARIA attributes
- Responsive design

**Usage:**

```tsx
import { Breadcrumb } from "@/components/ui";

// Basic breadcrumb
<Breadcrumb
  items={[
    { label: "Home", path: "/" },
    { label: "Streams", path: "/streams" },
    { label: "stream-123" },
  ]}
/>

// With admin action link (shown only for admin users)
<Breadcrumb
  items={[
    { label: "Home", path: "/" },
    { label: "Streams", path: "/streams" },
    { label: "stream-123" },
  ]}
  adminAction={{
    label: "Manage Stream",
    href: "/admin/streams/stream-123",
    icon: <AdminIcon />,
  }}
/>
```

**Integration with useAdmin:**

```tsx
import { useAdmin } from "@/hooks/useAdmin";
import { Breadcrumb } from "@/components/ui";

function MyPage() {
  const { isAdmin } = useAdmin();
  
  return (
    <Breadcrumb
      items={breadcrumbItems}
      adminAction={
        isAdmin
          ? {
              label: "Admin Action",
              href: "/admin/...",
              icon: <Icon />,
            }
          : undefined
      }
    />
  );
}
```

### CurrencyInput

A specialized input component for currency/asset amounts with built-in validation and formatting.

**Features:**
- Asset symbol badge display
- Decimal precision enforcement
- Real-time validation
- Error state styling
- Supports multiple Stellar assets (XLM, USDC, EURC, NGN, custom)

**Usage:**

```tsx
import { CurrencyInput } from "@/components/ui";
import { STELLAR_ASSETS } from "@/lib/stellar/assets";

function ClawbackForm() {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <CurrencyInput
      label="Clawback Amount"
      value={amount}
      onChange={setAmount}
      asset={STELLAR_ASSETS.USDC}
      error={error}
      helperText="Enter the amount to clawback"
    />
  );
}
```

**With validation hook:**

```tsx
import { CurrencyInput } from "@/components/ui";
import { useCurrencyInput } from "@/hooks/useCurrencyInput";
import { getAssetInfo } from "@/lib/stellar/assets";

function ValidatedInput({ assetCode, maxAmount }) {
  const asset = getAssetInfo(assetCode);
  const input = useCurrencyInput({
    asset,
    max: maxAmount,
    onValidChange: (stroops) => {
      console.log("Valid amount in stroops:", stroops);
    },
  });

  return (
    <CurrencyInput
      label="Amount"
      value={input.value}
      onChange={input.setValue}
      asset={asset}
      error={input.error}
    />
  );
}
```

### Navigation (NavLink, NavButton)

General-purpose navigation link and button components with consistent styling.

**Usage:**

```tsx
import { NavLink, NavButton } from "@/components/ui/Navigation";

// Navigation link
<NavLink href="/dashboard" isActive={pathname === "/dashboard"}>
  Dashboard
</NavLink>

// Navigation button
<NavButton onClick={handleClick} isActive={isSelected}>
  Filter
</NavButton>
```

## Currency Handling

### Asset Types and Configuration

The application supports multiple Stellar-based assets with proper decimal precision handling.

**Supported Assets:**

- **XLM** (Stellar Lumens) - Native asset, 7 decimals
- **USDC** (USD Coin) - Issued asset, 7 decimals
- **EURC** (Euro Coin) - Issued asset, 7 decimals
- **NGN** (Nigerian Naira) - Custom asset, 7 decimals
- **Custom assets** - Configurable decimals

**Asset Information:**

```tsx
import { getAssetInfo, STELLAR_ASSETS } from "@/lib/stellar/assets";

// Get predefined asset
const usdc = STELLAR_ASSETS.USDC;
console.log(usdc.symbol);    // "USDC"
console.log(usdc.decimals);  // 7
console.log(usdc.name);      // "USD Coin"

// Get asset by code (with fallback)
const asset = getAssetInfo("EURC");
```

### Amount Formatting

All amounts in Stellar are stored as "stroops" (smallest unit, similar to satoshis in Bitcoin).
For 7-decimal assets: 1 token = 10,000,000 stroops

**Converting stroops to human-readable amounts:**

```tsx
import { stroopsToAmount, formatAmountWithAsset } from "@/lib/stellar/assets";

// Convert stroops to formatted amount
const amount = stroopsToAmount("1005000000", 7);
// Returns: "100.5"

// Format with asset symbol
const formatted = formatAmountWithAsset("1005000000", "USDC");
// Returns: "100.5 USDC"
```

**Converting user input to stroops:**

```tsx
import { amountToStroops } from "@/lib/stellar/assets";

const stroops = amountToStroops("100.50", 7);
// Returns: "1005000000"
```

### Amount Validation

**Format validation:**

```tsx
import { validateAmountFormat } from "@/lib/stellar/assets";

const result = validateAmountFormat("100.50", 7);
if (result.valid) {
  console.log("Valid amount");
} else {
  console.log("Error:", result.error);
}
```

**Range validation:**

```tsx
import { validateAmountRange } from "@/lib/stellar/assets";

const result = validateAmountRange(
  "1000000000",  // amount (100 tokens)
  "500000000",   // min (50 tokens)
  "2000000000"   // max (200 tokens)
);
```

### Currency Input Hook

Use `useCurrencyInput` for managing validated currency input:

```tsx
import { useCurrencyInput } from "@/hooks/useCurrencyInput";
import { getAssetInfo } from "@/lib/stellar/assets";

function ClawbackForm({ streamData }) {
  const asset = getAssetInfo(streamData.assetCode);
  
  const clawbackInput = useCurrencyInput({
    asset,
    max: streamData.unclaimed,  // Maximum in stroops
    onValidChange: (stroops) => {
      // Called when input is valid
      console.log("Valid amount:", stroops);
    },
  });

  return (
    <div>
      <input
        value={clawbackInput.value}
        onChange={(e) => clawbackInput.setValue(e.target.value)}
      />
      {clawbackInput.error && <p>{clawbackInput.error}</p>}
      <button disabled={!clawbackInput.isValid}>
        Submit
      </button>
    </div>
  );
}
```

### Decimal Precision

Different assets may have different decimal precisions:

- **Standard Stellar assets**: 7 decimals (XLM, USDC, EURC)
- **Custom tokens**: Configurable (2, 4, 6, etc.)

**Example with 2-decimal asset:**

```tsx
const customAsset = {
  code: "CUSTOM",
  decimals: 2,
  symbol: "CUST",
  name: "Custom Token",
  type: "credit_alphanum4" as const,
};

// 100.50 tokens = 10050 stroops (for 2 decimals)
const stroops = amountToStroops("100.50", 2);
// Returns: "10050"

const amount = stroopsToAmount("10050", 2);
// Returns: "100.5"
```

### Displaying Amounts in Admin Pages

Admin pages should always display:
1. Asset symbol
2. Decimal precision
3. Properly formatted amounts

**Example:**

```tsx
import { getAssetInfo, stroopsToAmount } from "@/lib/stellar/assets";

function StreamOverview({ streamData }) {
  const asset = getAssetInfo(streamData.assetCode);
  const decimals = streamData.decimals ?? asset.decimals;

  return (
    <div>
      <div>
        <span>{asset.symbol}</span>
        <span>({decimals} decimals)</span>
      </div>
      <div>
        <p>Total Vested</p>
        <p>{stroopsToAmount(streamData.totalVested, decimals)}</p>
        <p>{asset.symbol}</p>
      </div>
    </div>
  );
}
```

### API Response Handling

Stream API responses now include optional asset fields:

```typescript
interface StreamRemainingResponse {
  totalVested: string;
  claimed: string;
  unclaimed: string;
  pendingClawback: string;
  assetCode?: string;      // e.g., "USDC"
  assetIssuer?: string;    // Issuer address
  decimals?: number;       // Override default decimals
}
```

**Fallback behavior:**
- If `assetCode` is missing, defaults to XLM
- If `decimals` is missing, uses asset's default decimals
- If asset is unknown, defaults to 7 decimals

## Utilities

### breadcrumbs.ts

Utility function to generate breadcrumb items from a pathname.

```tsx
import { generateBreadcrumbs } from "@/lib/breadcrumbs";

const breadcrumbs = generateBreadcrumbs("/streams/stream-123");
// Returns:
// [
//   { label: "Home", path: "/" },
//   { label: "Streams", path: "/streams" },
//   { label: "Stream 123", path: "/streams/stream-123" }
// ]
```

## Admin Session Management

### Session Requirements

Admin operations require active authentication sessions with valid tokens. The system automatically manages token refresh and session monitoring to prevent interruptions during critical operations.

**Session Duration:**
- Tokens expire based on backend configuration (typically 1 hour)
- System proactively refreshes tokens 5 minutes before expiry
- Warning shown when session expires within 10 minutes

**Automatic Token Refresh:**
- Happens automatically before every API call
- Triggered proactively 5 minutes before token expires
- Retries once on 401 (Unauthorized) responses
- Requires user to sign authentication challenge with wallet

**Session Monitoring:**

```tsx
import { useAdminSession } from "@/hooks/useAdminSession";
import { SessionWarning } from "@/components/ui";

function AdminPage() {
  const {
    isSessionValid,      // true if authenticated and admin
    isExpiringSoon,      // true if <5 minutes remaining
    canPerformActions,   // true if session valid and not expiring
    sessionWarning,      // warning message or null
    timeUntilExpiry,     // milliseconds until expiry
    refreshSession,      // manual refresh function
  } = useAdminSession();

  return (
    <>
      {/* Show session warning notification */}
      <SessionWarning
        warning={sessionWarning}
        onRefresh={refreshSession}
      />
      
      {/* Disable actions if session expiring */}
      <button disabled={!canPerformActions}>
        Perform Admin Action
      </button>
    </>
  );
}
```

**Form State Preservation:**

Admin forms automatically preserve their state during re-authentication:

```tsx
import { useFormStatePreservation } from "@/hooks/useFormStatePreservation";

function AdminForm() {
  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  
  const formState = { field1, field2 };

  useFormStatePreservation("unique-form-id", formState, {
    enabled: true,
    onRestore: (state) => {
      setField1(state.field1 as string);
      setField2(state.field2 as string);
      // Show notification that form was restored
    },
  });

  return <form>...</form>;
}
```

**Session Workflow:**

1. **Normal Operation:**
   - User performs admin actions normally
   - Token refreshes automatically every ~55 minutes
   - No user interruption

2. **Session Expiring:**
   - Warning shown 10 minutes before expiry
   - "Refresh Now" button available
   - Actions still work (trigger auto-refresh)

3. **Session Expired:**
   - User prompted to re-authenticate
   - Form state preserved automatically
   - State restored after successful re-auth

4. **Authentication Failure:**
   - Clear error message shown
   - Form state preserved
   - User can retry authentication

**Best Practices:**

- Don't disable actions based on `isExpiringSoon` alone
- Let the system handle token refresh automatically
- Show session warnings to keep users informed
- Use form state preservation for complex forms
- Test admin workflows with expired tokens

### Feature Flags

Feature flags control the gradual rollout of features in the application.

**Available Feature Flags:**
- `adminUI` - Controls visibility and access to all admin features

**Using Feature Flags:**

```tsx
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

function MyComponent() {
  const { adminUI, isFeatureEnabled } = useFeatureFlags();
  
  if (!adminUI) {
    return <FeatureNotAvailable />;
  }
  
  // Or check specific feature
  if (!isFeatureEnabled("adminUI")) {
    return <FeatureNotAvailable />;
  }
  
  return <AdminFeature />;
}
```

**Safety First:**
- All feature flags default to `false` (disabled)
- Features must be explicitly enabled via environment variables
- This ensures new features are not accidentally exposed

### useAdmin Hook

Check if the current user has admin privileges based on their wallet address.

```tsx
import { useAdmin } from "@/hooks/useAdmin";

function MyComponent() {
  const { isAdmin, isAdminUIEnabled, canAccessAdmin, adminAddresses } = useAdmin();
  
  // isAdmin: User's wallet is in admin list
  // isAdminUIEnabled: Admin UI feature flag is enabled
  // canAccessAdmin: BOTH conditions must be true
  
  if (!canAccessAdmin) {
    return <AccessDenied />;
  }
  
  return <AdminPanel />;
}
```

**Breaking Down Access Control:**
1. **isAdmin** - Checks if user's wallet is in `NEXT_PUBLIC_ADMIN_WALLETS`
2. **isAdminUIEnabled** - Checks if `NEXT_PUBLIC_ENABLE_ADMIN_UI=true`
3. **canAccessAdmin** - Returns `true` only if both above are `true`
```

### Admin-Only Links

Conditionally render admin links in navigation:

```tsx
import { useAdmin } from "@/hooks/useAdmin";

function Navigation() {
  const { isAdmin } = useAdmin();
  
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      {isAdmin && <Link href="/admin">Admin</Link>}
    </nav>
  );
}
```

## Accessibility

All navigation components follow WCAG 2.1 Level AA guidelines:

- Proper ARIA labels and attributes
- Keyboard navigation support
- Clear focus indicators
- Semantic HTML structure
- Screen reader friendly

**Currency inputs specifically:**
- `inputMode="decimal"` for numeric keyboards on mobile
- Clear error messages
- Associated labels
- Helper text for precision information

## Testing

Test utilities are available for all navigation and currency components:

```tsx
import { render, screen } from "@testing-library/react";
import { CurrencyInput } from "@/components/ui";
import { STELLAR_ASSETS } from "@/lib/stellar/assets";

it("displays USDC with proper precision", () => {
  render(
    <CurrencyInput
      value="100.50"
      onChange={jest.fn()}
      asset={STELLAR_ASSETS.USDC}
    />
  );
  
  expect(screen.getByText("USDC")).toBeInTheDocument();
  expect(screen.getByText(/7 decimal places/i)).toBeInTheDocument();
});
```

**Testing non-native assets:**

```tsx
import { stroopsToAmount, amountToStroops } from "@/lib/stellar/assets";

describe("EURC formatting", () => {
  it("formats EURC amounts correctly", () => {
    const amount = stroopsToAmount("501234560", 7);
    expect(amount).toBe("50.123456");
  });

  it("converts EURC to stroops", () => {
    const stroops = amountToStroops("50.123456", 7);
    expect(stroops).toBe("501234560");
  });
});
```

## Styling

Navigation components use the application's design tokens:

- `text-text-primary` - Active/current items
- `text-text-secondary` - Inactive items
- `text-text-muted` - Separators and hints
- `border-border-default` - Borders
- `bg-card` - Background for action buttons
- `gold` - Admin action highlights
- `status-danger` - Error states
- `status-success` - Valid states

**Currency input specific:**
- Asset badge: `bg-bg-primary` with `text-text-secondary`
- Error state: `border-status-danger` with `bg-status-danger/5`
- Normal state: `border-border-default` with focus on `gold`

## Configuration

Admin addresses are configured via environment variable:

```env
NEXT_PUBLIC_ADMIN_WALLETS=GADMIN123,GADMIN456,GADMIN789
```

Multiple addresses should be comma-separated. Whitespace is automatically trimmed.

### Admin UI Feature Flag

The admin UI is controlled by a feature flag for gradual rollout:

```env
NEXT_PUBLIC_ENABLE_ADMIN_UI=true
```

**Important:** The admin UI feature flag defaults to `false` (disabled) for safety. You must explicitly enable it to access admin features.

**Feature Flag Behavior:**
- When `NEXT_PUBLIC_ENABLE_ADMIN_UI=true`: Admin users can access admin pages
- When `NEXT_PUBLIC_ENABLE_ADMIN_UI=false` or unset: Admin pages are hidden from all users
- Admin links in navigation are automatically hidden when the feature is disabled
- Access attempts to admin pages show "Feature Not Available" message

**Example:**

```tsx
import { useAdmin } from "@/hooks/useAdmin";

function MyComponent() {
  const { isAdmin, isAdminUIEnabled, canAccessAdmin } = useAdmin();
  
  // isAdmin: true if user's wallet is in NEXT_PUBLIC_ADMIN_WALLETS
  // isAdminUIEnabled: true if NEXT_PUBLIC_ENABLE_ADMIN_UI=true
  // canAccessAdmin: true only if BOTH isAdmin AND isAdminUIEnabled are true
  
  if (!canAccessAdmin) {
    return <AccessDenied />;
  }
  
  return <AdminPanel />;
}
```

**Adding custom assets:**

Custom assets can be added to `STELLAR_ASSETS` in `/lib/stellar/assets.ts`:

```typescript
export const STELLAR_ASSETS: Record<string, AssetInfo> = {
  // ... existing assets
  MYCOIN: {
    code: "MYCOIN",
    issuer: "G...",  // Issuer address
    decimals: 7,
    symbol: "MYCOIN",
    name: "My Custom Coin",
    type: "credit_alphanum4",
  },
};
```

## Best Practices

1. **Always use stroops for storage and API calls** - Convert to human-readable only for display
2. **Show asset symbol and decimals in admin interfaces** - Users need context
3. **Validate amounts before submission** - Use `useCurrencyInput` or validation utilities
4. **Test with non-native assets** - Don't assume XLM; test with USDC, EURC, NGN
5. **Handle missing asset info gracefully** - Default to XLM with 7 decimals
6. **Format large numbers with commas** - Use `toLocaleString()` for readability
7. **Trim trailing zeros** - But keep at least 2 decimal places for readability
8. **Use exact BigInt arithmetic** - Avoid floating-point errors in conversion
