#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mon_site.settings')
django.setup()

from bookings.models import Prestation

# Supprimer les anciennes prestations
Prestation.objects.all().delete()

# Créer les 3 offres
offres = [
    {
        'nom': 'Soft Makeup',
        'description': 'Maquillage subtil et naturel',
        'options': {
            'Avec cils': 8000,
            'Sans cils': 6000
        }
    },
    {
        'nom': 'Glam Makeup',
        'description': 'Maquillage sophistiqué et lumineux',
        'options': {
            'Avec cils': 10000,
            'Sans cils': 8000
        }
    },
    {
        'nom': 'Wedding Makeup',
        'description': 'Maquillage pour votre grand jour',
        'options': {
            'Mariée': 15000,
            'Dame de compagnie': 10000,
            'Demoiselles d\'honneur': 5000
        }
    }
]

for offre in offres:
    prestation = Prestation.objects.create(
        nom=offre['nom'],
        description=offre['description'],
        options_json=json.dumps(offre['options'])
    )
    print(f"✅ {prestation.nom} créée avec ses options")

print("\n🎉 Toutes les offres sont prêtes!")
