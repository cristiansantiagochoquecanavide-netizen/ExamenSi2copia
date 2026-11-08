import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SaasService, PlanSuscripcionModel } from '../core/services/saas.service';

export interface ArPiece {
  id: string;
  name: string;
  category: string;
  material: string;
  price: number;
  imageUrl: string;
  isArReady: boolean;
  drapeDetail: string;
  wishlist?: boolean;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly saasService = inject(SaasService);

  // Planes de Suscripción SaaS (CU01)
  planes: PlanSuscripcionModel[] = [
    {
      id: 1,
      codigo: 'BASICO',
      nombre: 'Plan Básico Emprendedor',
      descripcion: 'Ideal para boutiques emergentes con hasta 2 sucursales físicas y ventas omnicanal.',
      precio_mensual: 29.99,
      limite_sucursales: 2,
      permite_ia: false,
      permite_offline: false,
      activo: true
    },
    {
      id: 2,
      codigo: 'INTERMEDIO',
      nombre: 'Plan Profesional Multitienda',
      descripcion: 'Para marcas en expansión con hasta 10 sucursales, sincronización offline en tiendas y concierge IA.',
      precio_mensual: 79.99,
      limite_sucursales: 10,
      permite_ia: true,
      permite_offline: true,
      activo: true
    },
    {
      id: 3,
      codigo: 'VIP',
      nombre: 'Plan Corporativo VIP',
      descripcion: 'Cadena omnicanal de alto volumen con sucursales ilimitadas, IA generativa VTON y analítica ML.',
      precio_mensual: 199.99,
      limite_sucursales: 999,
      permite_ia: true,
      permite_offline: true,
      activo: true
    }
  ];

  cargandoPlanes = false;

  // Carrusel de piezas de exhibición / probador virtual
  curatedPieces: ArPiece[] = [
    {
      id: 'ar-01',
      name: "Americana Estructurada 'Noir'",
      category: 'Sastrería',
      material: 'Lana virgen peinada',
      price: 1450,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjogABFmF-uQcsPi0fwzb-TM1aNyfo4jx_DcHcGWFAyRHy9BeBIHVF1x9fOg6yXorHEqoTnUhBz7_OXxD57ul0tliA5s6jf6HFntNsWdNbeoXdoPC92uS4O7cyrvT-jiDLdWPQoip-KHiH6krNhlzxoLFSYQNiEdoKoAOogXBafrYbea7sFh26XnsGi85-wOW86ssJLEQIEFVUS-I45D7j5mNNia18pMSCeyk6C-LI-17U1P_kpQID3QN4Eq39BN78BZBSUUZTTmY',
      isArReady: true,
      drapeDetail: 'Calce arquitectónico de hombros y caída rígida de solapa.'
    },
    {
      id: 'ar-02',
      name: 'Vestido Plisado Arquitectura',
      category: 'Vestidos',
      material: 'Seda orgánica fluida',
      price: 1890,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_-DsqBg_7ZHJgYu4abo4zwYWxhm7yVVEcojwFOhCX4qDzqc9IJyHtUEGpE5JbhbfEqyajp6tjLlwB2onotO_ofssuABRw_26DEoCO6_DkAXGyHwloXO_-NBUOlb17Pz699E8OlV3UYl0NofZIKe7VXA6ejKsTfP3XLYndWyutUZDYEF7MEOOphDgcTM9bX-asITaBkqXWY611jLuCByRPyN1lh15dBYxnYlYdVckBBunebS-L0y6nM1wCpkCv72psCaYH6EPUT4A',
      isArReady: true,
      drapeDetail: 'Micro-plisados dinámicos que reaccionan a giros corporales.'
    },
    {
      id: 'ar-03',
      name: 'Trench Escultural Modular',
      category: 'Abrigos',
      material: 'Gabardina técnica mate',
      price: 2100,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA07pWbLVRPZIJtdvG-AEQcYW5ktkihmu3zhyC01hNxdcLlJqZCqEo3iQmawzpa6Q-RU8z5yLsqgzqNc6iffM2WAreLFGpXL27o8lbvsSBB6rliNmWrCOXFafXoOPw_ohSongZuyavdZX4LVL04r5_diUp1lRwAIdeBZhIKXd3CzwrvQf34e5Vhx3uXWeDpgfeDDg85cuOT9E_mFEoL5T5oKRwD43Y-32Ary5XYEcEzKFGaJblkbv5fOun2XSptlBjEP35PMi4s8pU',
      isArReady: true,
      drapeDetail: 'Membrana impermeable de tensión adaptativa.'
    },
    {
      id: 'ar-04',
      name: 'Abrigo Sculptural No. 04',
      category: 'Abrigos',
      material: 'Lana cashmere pura estructurada',
      price: 2450,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYol-RVh89k_pIiGjtDbYZnKU1ssCufEXp08ssdCj-Q5w-hiKcQ09SnDzNLRK3HsWx20FT27gy94Gaqqo0BkQx_R52PwoXbvF18KP4YJmCIY1YnOc0odUGboz8BnJAbhJ7xkk3X7EyVIR4Hug472eBiKURodPK4zitOH7Zo8dkY3dVJFLSQXjYLKD5uMpIlaU8Wz2eJoAGgsfHzk9bVKdF0yPOHskqbKQOLxaAkKRmOSZ0D5QVXWJEk5iX4rFXb_1Q8xzU8oS8qrE',
      isArReady: true,
      drapeDetail: 'Silueta cocoon con cuello envolvente de alta densidad.'
    }
  ];

  carouselOffset = 0;
  readonly visibleItems = 3;

  // Modales interactivos
  selectedArPiece: ArPiece | null = null;
  isArModalOpen = false;
  isSessionModalOpen = false;
  sessionConfirmed = false;
  mobileMenuOpen = false;

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    this.cargandoPlanes = true;
    this.saasService.getPlanes().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.planes = data;
        }
        this.cargandoPlanes = false;
      },
      error: () => {
        this.cargandoPlanes = false;
      }
    });
  }

  getPlanFeatures(plan: PlanSuscripcionModel): { icon: string; text: string; included: boolean }[] {
    const isVip = plan.codigo === 'VIP';
    
    return [
      {
        icon: 'storefront',
        text: plan.limite_sucursales > 100 ? 'Sucursales ilimitadas' : `Hasta ${plan.limite_sucursales} sucursales físicas`,
        included: true
      },
      {
        icon: 'point_of_sale',
        text: 'Punto de Venta POS & Catálogo digital',
        included: true
      },
      {
        icon: 'inventory_2',
        text: 'Control de inventario multialmacén',
        included: true
      },
      {
        icon: 'sync_problem',
        text: 'Sincronización móvil offline (PWA)',
        included: plan.permite_offline
      },
      {
        icon: 'smart_toy',
        text: 'Asistente IA Concierge de ventas',
        included: plan.permite_ia
      },
      {
        icon: 'styler',
        text: 'Probador Virtual VTON con IA generativa',
        included: isVip
      },
      {
        icon: 'trending_up',
        text: 'Modelos predictivos Machine Learning',
        included: isVip
      },
      {
        icon: 'verified_user',
        text: 'Aislamiento Multitenant & Auditoría',
        included: true
      }
    ];
  }

  seleccionarPlan(plan: PlanSuscripcionModel): void {
    this.router.navigate(['/saas'], { queryParams: { planId: plan.id, codigo: plan.codigo } });
  }

  scrollToSection(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  explorarTienda(): void {
    this.router.navigate(['/catalogo']);
  }

  nextSlide(): void {
    const maxOffset = Math.max(0, this.curatedPieces.length - this.visibleItems);
    if (this.carouselOffset < maxOffset) {
      this.carouselOffset++;
    } else {
      this.carouselOffset = 0;
    }
  }

  prevSlide(): void {
    const maxOffset = Math.max(0, this.curatedPieces.length - this.visibleItems);
    if (this.carouselOffset > 0) {
      this.carouselOffset--;
    } else {
      this.carouselOffset = maxOffset;
    }
  }

  get visiblePieces(): ArPiece[] {
    return this.curatedPieces.slice(this.carouselOffset, this.carouselOffset + this.visibleItems);
  }

  openArModal(piece?: ArPiece): void {
    this.selectedArPiece = piece || this.curatedPieces[3];
    this.isArModalOpen = true;
  }

  closeArModal(): void {
    this.isArModalOpen = false;
    this.selectedArPiece = null;
  }

  openSessionModal(): void {
    this.isSessionModalOpen = true;
    this.sessionConfirmed = false;
  }

  closeSessionModal(): void {
    this.isSessionModalOpen = false;
  }

  confirmSession(): void {
    this.sessionConfirmed = true;
    setTimeout(() => {
      this.closeSessionModal();
    }, 2000);
  }

  toggleWishlist(piece: ArPiece): void {
    piece.wishlist = !piece.wishlist;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
