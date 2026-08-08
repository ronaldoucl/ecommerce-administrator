// Inventory lives on variants, and the checkout is variant-based from end to
// end, so a product with no variants has nowhere to keep stock and can never be
// bought. To close that dead end every product keeps at least one variant: one
// labelled "Default" is created for products sold without options (no sizes, no
// colours).
//
// It is an ordinary variant in the database — the admin can rename it and set its
// stock like any other. The storefront just hides the label, so customers never
// read "Default" next to a product name.
export const DEFAULT_VARIANT_LABEL = 'Default';
