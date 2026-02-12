from django.urls import path
from . import views

urlpatterns = [
    path('', views.accueil, name='accueil'),
    path('reserver/<int:prestation_id>/', views.reserver, name='reserver'),
    path('mes-rendez-vous/', views.mes_rendez_vous, name='mes_rendez_vous'),
]
