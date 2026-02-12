from django.contrib import admin
from .models import Prestation, RendezVous

@admin.register(Prestation)
class PrestationAdmin(admin.ModelAdmin):
    list_display = ('nom', 'description')
    search_fields = ('nom',)

@admin.register(RendezVous)
class RendezVousAdmin(admin.ModelAdmin):
    list_display = ('nom_cliente', 'prestation', 'date_rdv', 'email', 'option_choisie', 'prix_final')
    list_filter = ('date_rdv', 'prestation')
    search_fields = ('nom_cliente', 'email')
    readonly_fields = ('date_rdv',)
