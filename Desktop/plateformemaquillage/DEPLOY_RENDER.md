# Guide de déploiement sur Render

## Étape 1: Préparer ton code

1. Crée un compte GitHub (gratuit): https://github.com
2. Crée un nouveau repository: `melle-makeup`
3. Push ton code:

```bash
cd /Users/yacinn_officiel/Desktop/plateformemaquillage
git init
git add .
git commit -m "Initial commit: M'Elle Make Up"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/melle-makeup.git
git push -u origin main
```

(Remplace `TON_USERNAME` par ton username GitHub)

---

## Étape 2: Déployer sur Render

1. Va sur: https://render.com
2. Clique sur "New +" → "Web Service"
3. Connecte ton GitHub
4. Sélectionne le repo `melle-makeup`
5. Remplissez:
   - **Name**: `melle-makeup`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command**: `gunicorn mon_site.wsgi:application`

6. Clique sur "Deploy"

---

## Étape 3: Créer un super-utilisateur

Une fois déployé sur Render:

1. Va dans le terminal Render
2. Exécute:
```bash
python manage.py createsuperuser
```

3. Entre tes infos (username, email, password)

---

## Étape 4: Accéder à ton site

- **Site public**: https://melle-makeup.render.com
- **Admin**: https://melle-makeup.render.com/admin/

---

## Troubleshooting

### Le site ne démarre pas?
- Vérifiez les logs dans Render dashboard
- Assurez-vous que `render.yaml` existe
- Vérifiez que `requirements.txt` est à jour

### Erreur de base de données?
- Render fournit une DB PostgreSQL automatiquement
- Assurez-vous que `DEBUG=False` en production

### Les clientes ne peuvent pas réserver?
- Vérifiez que `ALLOWED_HOSTS` inclut votre domaine Render
- Activez les migrations: `python manage.py migrate`

---

**C'est en ligne! 🎉**
