import { Component, inject, OnInit, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
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
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly saasService = inject(SaasService);
  private readonly elRef = inject(ElementRef);

  // Tema dinámico de color según scroll
  currentTheme: 'theme-noir' | 'theme-urban' | 'theme-sport' | 'theme-light' = 'theme-light';
  private observer: IntersectionObserver | null = null;

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

  readonly Math = Math;
  isMarqueePaused = false;

  // Carrusel Showroom Multimodelo (15 Modelos Reales)
  curatedPieces: ArPiece[] = [
    {
      id: 'model-01',
      name: 'Conjunto Denim Urbano & Crop Top',
      category: 'Streetwear',
      material: 'Algodón peinado & Denim 14oz',
      price: 149,
      imageUrl: 'assets/images/models/bad_gyal_chinatown_denim.jpg',
      isArReady: true,
      drapeDetail: 'Calce holgado tiro bajo con caída recta sobre zapatilla urbana.'
    },
    {
      id: 'model-02',
      name: 'Abrigo de Piel Sintética Ártica',
      category: 'Alta Costura',
      material: 'Piel sintética ártica premium & satén',
      price: 489,
      imageUrl: 'assets/images/models/bad_gyal_fur_coat.jpg?v=2',
      isArReady: true,
      drapeDetail: 'Silueta envolvente con cuello esmoquin y forro de satén acolchado.'
    },
    {
      id: 'model-03',
      name: 'Chaqueta Aviador Cuero & Sherpa',
      category: 'Moda Masculina',
      material: 'Cuero napa vacuno & Cuello borrego',
      price: 380,
      imageUrl: 'assets/images/models/quevedo_gq_sherpa.jpg',
      isArReady: true,
      drapeDetail: 'Corte boxy estructurado con solapas altas y hebillas metálicas.'
    },
    {
      id: 'model-04',
      name: 'Vestido Corsetero Escultural Rosa',
      category: 'Alta Costura',
      material: 'Crepé de seda & Ballenas flexibles',
      price: 620,
      imageUrl: 'assets/images/models/vestido_corset_rosa.jpg?v=2',
      isArReady: true,
      drapeDetail: 'Entallado de silueta reloj de arena con soporte anatómico interior.'
    },
    {
      id: 'model-05',
      name: 'Jeans Flare Desgastados Y2K',
      category: 'Streetwear',
      material: 'Denim vintage con roturas láser',
      price: 175,
      imageUrl: 'assets/images/models/bad_gyal_y2k_ripped_denim.jpg',
      isArReady: true,
      drapeDetail: 'Cintura baja con bota flare acampanada y desgastes artesanales.'
    },
    {
      id: 'model-06',
      name: 'Vestido Red Glitter Espalda Abierta',
      category: 'Alta Costura',
      material: 'Malla metálica & Cristales checos',
      price: 540,
      imageUrl: 'assets/images/models/bad_gyal_glitter_dress.jpg',
      isArReady: true,
      drapeDetail: 'Drapeado fluido con espalda totalmente descubierta y caída cascada.'
    },
    {
      id: 'model-07',
      name: 'Jeans Baggy Skate & Musculosa',
      category: 'Streetwear',
      material: 'Denim orgánico lavado piedra',
      price: 130,
      imageUrl: 'assets/images/models/baggy_denim_essential.jpg',
      isArReady: true,
      drapeDetail: 'Corte balloon relajado con tiro medio y botamanga ancha.'
    },
    {
      id: 'model-08',
      name: 'Camisa Entallada Popelina & Estola',
      category: 'Sastrería',
      material: 'Popelina egipcia & Visón sintético',
      price: 310,
      imageUrl: 'assets/images/models/kylie_jenner_poplin_shirt.jpg',
      isArReady: true,
      drapeDetail: 'Pinzas de entalle corsetero en torso y cuello clásico italiano.'
    },
    {
      id: 'model-09',
      name: 'Pantalón Denim Oversized Skater',
      category: 'Streetwear',
      material: 'Denim pesado 100% algodón',
      price: 140,
      imageUrl: 'assets/images/models/oversized_streetwear_denim.jpg',
      isArReady: true,
      drapeDetail: 'Silueta ultra-oversized skater con pretina caída y bolsillos cargo.'
    },
    {
      id: 'model-10',
      name: 'Traje Sastre Oversized Tono Arena',
      category: 'Moda Masculina',
      material: 'Lana tropical tono camello',
      price: 750,
      imageUrl: 'assets/images/models/rauw_alejandro_camel_suit.jpg',
      isArReady: true,
      drapeDetail: 'Hombreras extendidas estilo 90s con caída fluida de pantalón pinzado.'
    },
    {
      id: 'model-11',
      name: 'Conjunto Biker Seamless & Sneakers',
      category: 'Athleisure',
      material: 'Microfibra elástica & Suela EVA multicapa',
      price: 220,
      imageUrl: 'assets/images/models/athleisure_biker_sneakers.jpg',
      isArReady: true,
      drapeDetail: 'Compresión media transpirable con zapatilla amortiguada para asfalto.'
    },
    {
      id: 'model-12',
      name: 'Chaqueta Bomber Varsity & Shorts',
      category: 'Athleisure',
      material: 'Algodón peinado & Felpa francesa',
      price: 260,
      imageUrl: 'assets/images/models/varsity_sport_brown.jpg',
      isArReady: true,
      drapeDetail: 'Chaqueta universitaria con broches de presión y short deportivo high-waist.'
    },
    {
      id: 'model-13',
      name: 'Conjunto Deportivo Monocromo Pro',
      category: 'Athleisure',
      material: 'Poliamida seamless 4-way stretch',
      price: 195,
      imageUrl: 'assets/images/models/gym_training_gray_set.jpg',
      isArReady: true,
      drapeDetail: 'Ajuste de segunda piel termoactivo con chaqueta bomber ligera.'
    },
    {
      id: 'model-14',
      name: 'Total Look Denim Campera Boxy',
      category: 'Streetwear',
      material: 'Denim añejo índigo puro',
      price: 290,
      imageUrl: 'assets/images/models/sydney_sweeney_double_denim.jpg',
      isArReady: true,
      drapeDetail: 'Campera boxy con hombros caídos y pantalón palazzo de tiro alto.'
    },
    {
      id: 'model-15',
      name: 'Vestido Lencero de Satén Celeste',
      category: 'Alta Costura',
      material: 'Satén de seda natural celeste',
      price: 420,
      imageUrl: 'assets/images/models/sydney_sweeney_satin_dress.jpg',
      isArReady: true,
      drapeDetail: 'Corte al bies con caída fluida diagonal y escote drapeado suave.'
    }
  ];

  selectedNiche: string = 'TODOS';
  carouselOffset = 0;
  readonly visibleItems = 3;

  get filteredPieces(): ArPiece[] {
    if (this.selectedNiche === 'TODOS') {
      return this.curatedPieces;
    }
    return this.curatedPieces.filter(p => 
      p.category.toLowerCase().includes(this.selectedNiche.toLowerCase())
    );
  }

  setNiche(niche: string): void {
    this.selectedNiche = niche;
    this.carouselOffset = 0;
  }

  // Modales interactivos
  selectedArPiece: ArPiece | null = null;
  isArModalOpen = false;
  isSessionModalOpen = false;
  sessionConfirmed = false;
  mobileMenuOpen = false;

  getCategoryBadgeClass(cat: string): string {
    const c = cat.toLowerCase();
    if (c.includes('street')) return 'pill-street';
    if (c.includes('costura') || c.includes('vestido') || c.includes('gala')) return 'pill-couture';
    if (c.includes('masculina') || c.includes('sastrería')) return 'pill-men';
    if (c.includes('sport') || c.includes('athleisure') || c.includes('calzado')) return 'pill-sport';
    return '';
  }

  ngOnInit(): void {
    this.cargarPlanes();
  }

  ngAfterViewInit(): void {
    // Scroll observer removed
    this.asegurarVideosSilenciados();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private iniciarScrollObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const sections = [
      { id: 'hero-section', theme: 'theme-light' as const },
      { id: 'story-elegante', theme: 'theme-light' as const },
      { id: 'story-urbano', theme: 'theme-light' as const },
      { id: 'story-running', theme: 'theme-light' as const },
      { id: 'planes-saas', theme: 'theme-light' as const }
    ];

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const match = sections.find(s => s.id === entry.target.id);
          if (match) {
            this.currentTheme = match.theme;
          }
        }
      }
    }, {
      root: null,
      threshold: 0.25
    });

    for (const item of sections) {
      const el = this.elRef.nativeElement.querySelector(`#${item.id}`);
      if (el) {
        this.observer.observe(el);
      }
    }
  }

  private asegurarVideosSilenciados(): void {
    const videos: NodeListOf<HTMLVideoElement> = this.elRef.nativeElement.querySelectorAll('video');
    videos.forEach(v => {
      v.muted = true;
      v.defaultMuted = true;
      v.volume = 0;
      v.play().catch(() => {
        // Autoplay policy handled silently
      });
    });
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
    const list = this.filteredPieces;
    const maxOffset = Math.max(0, list.length - this.visibleItems);
    if (this.carouselOffset < maxOffset) {
      this.carouselOffset++;
    } else {
      this.carouselOffset = 0;
    }
  }

  prevSlide(): void {
    const list = this.filteredPieces;
    const maxOffset = Math.max(0, list.length - this.visibleItems);
    if (this.carouselOffset > 0) {
      this.carouselOffset--;
    } else {
      this.carouselOffset = maxOffset;
    }
  }

  get visiblePieces(): ArPiece[] {
    return this.filteredPieces.slice(this.carouselOffset, this.carouselOffset + this.visibleItems);
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
