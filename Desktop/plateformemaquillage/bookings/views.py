from django.shortcuts import render, redirect
from django.contrib import messages
from .models import Prestation, RendezVous
from django.views.decorators.http import require_http_methods

def accueil(request):
    prestations = Prestation.objects.all()
    return render(request, 'bookings/accueil.html', {'prestations': prestations})

@require_http_methods(["GET", "POST"])
def reserver(request, prestation_id):
    prestation = Prestation.objects.get(id=prestation_id)
    options = prestation.get_options()
    
    if request.method == 'POST':
        nom = request.POST.get('nom')
        email = request.POST.get('email')
        date_rdv = request.POST.get('date_rdv')
        option_choisie = request.POST.get('option')
        message = request.POST.get('message', '')
        
        # Récupérer le prix de l'option
        prix_final = None
        if option_choisie and option_choisie in options:
            prix_final = options[option_choisie]
        
        RendezVous.objects.create(
            nom_cliente=nom,
            email=email,
            date_rdv=date_rdv,
            prestation=prestation,
            option_choisie=option_choisie,
            prix_final=prix_final,
            message=message
        )
        messages.success(request, 'Votre rendez-vous a été confirmé!')
        return redirect('accueil')
    
    return render(request, 'bookings/reserver.html', {
        'prestation': prestation,
        'options': options
    })

def mes_rendez_vous(request):
    email = request.GET.get('email')
    rendez_vous = []
    
    if email:
        rendez_vous = RendezVous.objects.filter(email=email).order_by('-date_rdv')
    
    return render(request, 'bookings/mes_rendez_vous.html', {
        'rendez_vous': rendez_vous,
        'email_recherche': email
    })
