# Frontend Patch Notes (v7.5.1)

- i18n: use `useI18n.ts` and `strings.json` for labels.
- Skeletons (exemplo):
```html
<div class="skeleton-line"></div>
<style>
.skeleton-line{height:16px;border-radius:8px;animation:pulse 1.2s infinite;opacity:.6}
@keyframes pulse{0%{background:#9992}50%{background:#9995}100%{background:#9992}}
</style>
```
Substitua labels estáticos por `const { t } = useI18n();` e `t('analytics')`, etc.
