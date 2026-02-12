from django.db import models
import json

class Prestation(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    options_json = models.TextField(blank=True, default='{}')  # JSON pour les sous-options
    
    def __str__(self):
        return self.nom
    
    def get_options(self):
        """Récupère les options sous forme de dictionnaire"""
        if self.options_json:
            return json.loads(self.options_json)
        return {}

class RendezVous(models.Model):
    nom_cliente = models.CharField(max_length=100)
    email = models.EmailField()
    date_rdv = models.DateTimeField()
    prestation = models.ForeignKey(Prestation, on_delete=models.CASCADE)
    option_choisie = models.CharField(max_length=200, blank=True)  # Ex: "avec cils"
    prix_final = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    message = models.TextField(blank=True)

    def __str__(self):
        return f"{self.nom_cliente} - {self.date_rdv}"