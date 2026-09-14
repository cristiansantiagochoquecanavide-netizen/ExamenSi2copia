import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

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
export class LandingPageComponent {
  private readonly router = inject(Router);

  // Carrusel de piezas AR
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
