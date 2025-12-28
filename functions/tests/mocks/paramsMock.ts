export const defineSecret = (name: string) => ({
  value: () => process.env[name] || 'test_secret_value'
});
