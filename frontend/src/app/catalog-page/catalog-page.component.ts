import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../dashboard/punto-venta-pos/cart.service';

export interface CatalogProduct {
  id: string;
  name: string;
  category: 'Abrigos' | 'Sastrería' | 'Vestidos' | 'Calzado';
  material: string;
  price: number;
  imageUrl: string;
  isArReady: boolean;
  sizes: string[];
  colors: string[];
  activeColorIndex: number;
  wishlist?: boolean;
  description?: string;
}

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.scss'
})
export class CatalogPageComponent {
  private readonly router = inject(Router);
  readonly cartService = inject(CartService);

  // Estados de filtros
  selectedCategory: string = 'Todos';
  selectedSize: string = '';
  arFilterOnly: boolean = true;
  sortBy: string = 'Novedades';
  mobileMenuOpen: boolean = false;

  // Modales interactivos
  selectedProductForAR: CatalogProduct | null = null;
  isArModalOpen: boolean = false;
  isSessionModalOpen: boolean = false;
  sessionConfirmed: boolean = false;
  addedToCartNotification: string | null = null;

  // Catálogo completo de prendas de lujo
  products: CatalogProduct[] = [
    {
      id: 'FS-001',
      name: 'Abrigo Sculptural No. 04',
      category: 'Abrigos',
      material: 'Lana cashmere pura estructurada',
      price: 2450,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYol-RVh89k_pIiGjtDbYZnKU1ssCufEXp08ssdCj-Q5w-hiKcQ09SnDzNLRK3HsWx20FT27gy94Gaqqo0BkQx_R52PwoXbvF18KP4YJmCIY1YnOc0odUGboz8BnJAbhJ7xkk3X7EyVIR4Hug472eBiKURodPK4zitOH7Zo8dkY3dVJFLSQXjYLKD5uMpIlaU8Wz2eJoAGgsfHzk9bVKdF0yPOHskqbKQOLxaAkKRmOSZ0D5QVXWJEk5iX4rFXb_1Q8xzU8oS8qrE',
      isArReady: true,
      sizes: ['S', 'M', 'L'],
      colors: ['#f4f2ee', '#111111', '#4a4b4d'],
      activeColorIndex: 0,
      description: 'Silueta arquitectónica en lana pura con simulación de caída volumétrica.'
    },
    {
      id: 'FS-002',
      name: 'Americana Estructurada Noir',
      category: 'Sastrería',
      material: 'Lana virgen peinada',
      price: 1450,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvOmZG7ChRlFmR_zG6cIyEN7GXkicCOBW_QPyvUfjD1KzQKKU-DYE5HYD0yTXmaCAf_NsZND22fsAUXm5JD2WAMi_pzf1nIGdXzlQulpWc76qjceJpCrISQvEmVRL_RzQSfG_RD7nDpv8oIJoRxDmH5ahOJBSzHTGVtHOtZZyZErLf-G-KamkZGjEqWx3GeDRc7o__8tbJUsyQfBp51KQBuOmewOloNfpwwZe4eaVsk_KoVUMVXkIYT_sPUDriAo6K3WrJqXn8M2Y',
      isArReady: true,
      sizes: ['XS', 'S', 'M'],
      colors: ['#111111', '#192231'],
      activeColorIndex: 0,
      description: 'Solapas de corte milimétrico inspiradas en la alta costura parisina.'
    },
    {
      id: 'FS-003',
      name: 'Vestido Plisado Arquitectura',
      category: 'Vestidos',
      material: 'Seda orgánica fluida',
      price: 1890,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7Gn3Nc_VVRaJ191IZW7rZcJ4yLNlZ6ERAhI7D1Wz6uxALWf_eDRRLE87ILk33M753UM0wlhD0B8uuOnJi5AjBBOnPcAR13vsRpVIcI_ZIINV1wifXmA3TOlvbmEXqiUSSonrZoqbCGy2fzjyn46oc7Cd_0WytwdLypZFjJ7t12fq_s67HkQ1CXdfqnUZUfB5BANw2bZGpAPEfmvtJW91wdNELrNe1K5UgiViifC2hbGCiLUt5jKO9uuH2m4PpGkiGlV8yhpJWXPI',
      isArReady: true,
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['#f6f2e8', '#e3e2de'],
      activeColorIndex: 0,
      description: 'Micro-plisados suspendidos que fluyen con elegancia en render tridimensional.'
    },
    {
      id: 'FS-004',
      name: 'Trench Escultural Modular',
      category: 'Abrigos',
      material: 'Gabardina técnica mate',
      price: 2100,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4EmeFD-_M5C_mIpwNI2t4zrS9lqSfHIrsiaD2Bt3jcwjwbJMYE9Q94DBsiMVAdBPXmsMyeRPJ0UJGsmNfiyaeHSdRiLtq5gRLTsYZySZd-6sVo_e7-wiTcydMJ-g2ijSWHdQWKpA64jcZGDdtHuuP2bE1g6uKjEirr4SCF_CJptPPgfr4EjeRkDAZDwIw-cpQ_pya4qip_HaGcB-kAayRy2scBsOOR2P1l4qHJDZwyAOHSqzog52DBLx8RBRFTo8QJV3PWEA_HuE',
      isArReady: true,
      sizes: ['S', 'M', 'L'],
      colors: ['#d7cfc2', '#b5aca1'],
      activeColorIndex: 0,
      description: 'Prenda exterior técnica con ajustes modulares y cinturón escultural.'
    },
    {
      id: 'FS-005',
      name: 'Pantalón Sartorial Deconstruido',
      category: 'Sastrería',
      material: 'Lana fría con pinzas arquitectónicas',
      price: 980,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOY_KDd-aS56zHIBIg9_JOIcGZ9uZru8QcJlSkhp5UZpE250yZhk7ptxeLg7PMoisCXe1YdpXzzzYqMCLsnb7xPJdlfNCm0P5dp6XEk59SAqXcBFpw925_B4h1slwufLcI-qyobXQ-UZfZZ6EnoUhQCdenSF8NmxUO4jd6e7xJqEgBTkkHK9haFiDclCTEeSnsnPkA5TLURG0BgfLCLmS-q6gTxZ-LSMfSpIoyclswc009Bo92R9wi4YYOj7Mfwyjj0le9V54e_nk',
      isArReady: true,
      sizes: ['S', 'M', 'L'],
      colors: ['#282c30', '#8c9096'],
      activeColorIndex: 0,
      description: 'Pinzas deconstruidas en cintura alta para una caída vertical impecable.'
    },
    {
      id: 'FS-006',
      name: 'Vestido Minimalista Columna',
      category: 'Vestidos',
      material: 'Crepé de seda pesada',
      price: 1650,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByNoAC2i59iIXwPggcQIT-10d3I7owbrwUaMX99NElx2U2UUCGyutQs65E04KgkTVjr2KvYkbeufrxgPZuT8IPcdnGXTL2U9G5J_SomSHNdbWN72nKmmEj9f8kbqxhIc60JOy-1YaKciZVVALmP5vykArWObCW3XKUoiWomQO0k8KJS2biy0Ku8iFM8KNY_qyI44IpGHUCtGfGNeruujeK_l6jVbst_4ENx_nvkjDh_Utasm_2MkARt8xR6hwsufYc9q1bWpOf9lQ',
      isArReady: true,
      sizes: ['XS', 'S'],
      colors: ['#ffffff', '#1a1a1a'],
      activeColorIndex: 0,
      description: 'Línea de columna depurada, pureza absoluta y confección artesanal.'
    },
    {
      id: 'FS-007',
      name: 'Sobrecamisa de Cuero Nappa',
      category: 'Sastrería',
      material: 'Piel suave acabado mate',
      price: 1750,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdiBvh0JUrP_OasfVNgpwF0uNbJm9q0PrSUOTuQLEVv4Oz3Xr6uniRTArUPsKxnpPYmyrDoAi-fS2gEM8-IC_J_Bf10rvHeoDbU2tTOjQlmruJM23PsdwjfwRPsV7yhmEJrq6a16qENAF05qVbd3PqorSv-TcsQsL_DfUkIfmGZPqXlgIL5Wk799eYyCJqTgcEPqzWmOLyQ5dV--i8uZsnfy6ZBYp-A_ouU_g4d7k7JhkqEXydgFrmEKQVLC8sQ9Ard6uCoYcUDZU',
      isArReady: false,
      sizes: ['M', 'L'],
      colors: ['#382417', '#111111'],
      activeColorIndex: 0,
      description: 'Nappa ultraligera curtida de manera sustentable con botones ocultos.'
    },
    {
      id: 'FS-008',
      name: 'Botín Escultura Tacón Geométrico',
      category: 'Calzado',
      material: 'Cuero vacuno pulido',
      price: 1150,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCt170h4R3wwJMj0dL0IgQ8sRmPEgaGm9qzttmTA0-yXE0xq9JVSSOal6vqeGgiIdQ8cses6VKFIXSzIhG6RomRY1Oob-ewUBjR3ga0RNr3vC4mo_-Q7TzZOVvE17iACBVyDIwU78iNn38YX0-Evx_OWTHKLXqW3E3JQmb2w3j8ouy2EaVWH93c9hWtVL6cHArCZ_eZL8nuVwgZRHWMSq4wW-FbuRpZX1_xDdPlGpi2wMTOTTASA5JkumJy1WgI5nBWbbjoaG5jdwg',
      isArReady: true,
      sizes: ['38', '39', '40'],
      colors: ['#111111'],
      activeColorIndex: 0,
      description: 'Tacón facetado de resina arquitectónica y empeine elástico ergonómico.'
    }
  ];

  get filteredProducts(): CatalogProduct[] {
    return this.products
      .filter(item => {
        // Filtro de categoría
        if (this.selectedCategory !== 'Todos' && item.category !== this.selectedCategory) {
          return false;
        }
        // Filtro AR
        if (this.arFilterOnly && !item.isArReady) {
          return false;
        }
        // Filtro de talla
        if (this.selectedSize && !item.sizes.includes(this.selectedSize)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (this.sortBy === 'Precio: Menor a Mayor') {
          return a.price - b.price;
        }
        if (this.sortBy === 'Precio: Mayor a Menor') {
          return b.price - a.price;
        }
        if (this.sortBy === 'Destacados AR') {
          return (b.isArReady ? 1 : 0) - (a.isArReady ? 1 : 0);
        }
        return 0; // Novedades default
      });
  }

  get categoryCounts(): { [key: string]: number } {
    return {
      Todos: this.products.length,
      Abrigos: this.products.filter(p => p.category === 'Abrigos').length,
      Sastrería: this.products.filter(p => p.category === 'Sastrería').length,
      Vestidos: this.products.filter(p => p.category === 'Vestidos').length,
      Calzado: this.products.filter(p => p.category === 'Calzado').length
    };
  }

  setCategory(category: string): void {
    this.selectedCategory = category;
  }

  toggleSize(size: string): void {
    this.selectedSize = this.selectedSize === size ? '' : size;
  }

  limpiarFiltros(): void {
    this.selectedCategory = 'Todos';
    this.selectedSize = '';
    this.arFilterOnly = false;
    this.sortBy = 'Novedades';
  }

  selectColor(product: CatalogProduct, colorIndex: number): void {
    product.activeColorIndex = colorIndex;
  }

  toggleWishlist(product: CatalogProduct): void {
    product.wishlist = !product.wishlist;
  }

  openArModal(product: CatalogProduct): void {
    this.selectedProductForAR = product;
    this.isArModalOpen = true;
  }

  closeArModal(): void {
    this.isArModalOpen = false;
    this.selectedProductForAR = null;
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

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  addToBag(product: CatalogProduct): void {
    this.addedToCartNotification = `«${product.name}» añadida a la bolsa.`;
    setTimeout(() => {
      this.addedToCartNotification = null;
    }, 3000);
  }
}
