from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DutyEventDetailView, DutyEventListCreateView, TripViewSet
from hos.views import TripCheckView

router = DefaultRouter()
router.register(r'trips', TripViewSet)

urlpatterns = [
    # Must come before the router include: DefaultRouter's detail route
    # (trips/<pk>/) would otherwise swallow "check" as a pk value.
    path('trips/check/', TripCheckView.as_view(), name='trip-check'),
    path(
        'trips/<int:trip_id>/duty-events/',
        DutyEventListCreateView.as_view(),
        name='trip-duty-events',
    ),
    path(
        'trips/<int:trip_id>/duty-events/<int:pk>/',
        DutyEventDetailView.as_view(),
        name='trip-duty-event-detail',
    ),
    path('', include(router.urls)),
]
