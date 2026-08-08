// Every product has at least one variant, because stock lives on variants and
// the checkout needs a variantId. Products sold without options get one labelled
// "Default", created by the backend.
//
// That label is an implementation detail: customers should just see the product
// name, so these helpers hide it wherever a variant label is shown.
export const DEFAULT_VARIANT_LABEL = 'Default';

export function isDefaultVariantLabel(label) {
  return typeof label === 'string' && label.trim().toLowerCase() === 'default';
}

// The label to show a customer: null when there is nothing worth showing.
export function displayVariantLabel(label) {
  return !label || isDefaultVariantLabel(label) ? null : label;
}
