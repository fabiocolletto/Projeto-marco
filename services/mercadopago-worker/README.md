<!-- MP_PLANS_DOC_START -->
## Planos (produção) configurados
- MASTER:  305768f19aab48cabb969e97d38c98b4
- PRO:     b10caa06c8e34532845b597a79346963
- STARTER: 74c6b04f57a04d6db6855307975dc12b

### Checagem rápida
- `GET /plans` deve retornar esses três IDs.
- `POST /subscribe { email, plan: "pro" }` usa o PLAN_PRO_ID e retorna um `init_point` (quando aplicável).
- Após autorização, `GET /license/validate?user=<email>` deve indicar `status=active`.
<!-- MP_PLANS_DOC_END -->
