export type ProviderId = "stripe" | "jazzcash" | "easypaisa";
export const PROVIDER_IDS: ProviderId[] = ["stripe", "jazzcash", "easypaisa"];

export interface FieldDef { key: string; label: string; secret: boolean; hint?: string }

export interface ProviderMeta {
  label: string;
  /** null = any currency the provider account supports */
  currencies: string[] | null;
  /** has separate sandbox (test) and live environments chosen in Settings */
  environments: boolean;
  fields: FieldDef[];
}

export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  stripe: {
    label: "Stripe", currencies: null, environments: false,
    fields: [
      { key: "secret_key", label: "Secret key", secret: true, hint: "sk_test_… for testing, sk_live_… when live" },
      { key: "webhook_secret", label: "Webhook signing secret", secret: true, hint: "whsec_… from the webhook you create in Stripe" },
    ],
  },
  jazzcash: {
    label: "JazzCash", currencies: ["PKR"], environments: true,
    fields: [
      { key: "merchant_id", label: "Merchant ID", secret: false },
      { key: "password", label: "Password", secret: true },
      { key: "integrity_salt", label: "Integrity salt", secret: true },
    ],
  },
  easypaisa: {
    label: "Easypaisa", currencies: ["PKR"], environments: true,
    fields: [
      { key: "store_id", label: "Store ID", secret: false },
      { key: "hash_key", label: "Hash key", secret: true },
      { key: "account_num", label: "Account number", secret: false },
      { key: "username", label: "API username", secret: false, hint: "Used to confirm each payment with Easypaisa" },
      { key: "password", label: "API password", secret: true },
    ],
  },
};

export type Environment = "sandbox" | "live";

export interface ProviderConfig {
  environment: Environment;
  values: Record<string, string>;
}

/** What the browser is told to do to start paying */
export type Checkout =
  | { kind: "redirect"; url: string }
  | { kind: "form"; action: string; method: "POST"; fields: Record<string, string> };

export interface Order {
  /** Our reference for this attempt; the provider echoes it back */
  ref: string;
  amount: number;
  currency: string;
  description: string;
  /** Where the provider sends the customer / its server afterwards */
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
}
