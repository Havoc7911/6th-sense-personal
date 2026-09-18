import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag, ChevronRight, ChevronDown } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { serviceCategories } from '../lib/services';
import './Services.css';

function CategoryBlock({ cat }) {
  const [open, setOpen] = useState(false);
  const CatIcon = cat.icon;
  return (
    <div className="category-block glass-panel">
      <button className="category-header category-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <div className="category-name">
          <CatIcon size={20} className="category-icon" />
          <h2>{cat.name}</h2>
        </div>
        <div className="category-header-right">
          <span className="unit-count">{cat.items.length} {cat.items.length === 1 ? 'service' : 'services'}</span>
          <ChevronDown size={18} className={`category-chevron ${open ? 'open' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="category-items animate-fade-in">
          {cat.items.map((item, itemIdx) => (
            <Link key={itemIdx} to={`/intake?service=${item.id}`} className="service-row service-link">
              <div className="service-info">
                <h3>{item.title}</h3>
                {item.detail && <p className="service-detail">{item.detail}</p>}
              </div>
              <div className="service-row-right">
                <span className="service-price">{item.price}</span>
                <ChevronRight size={18} className="service-arrow" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Services() {
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.from('promotions').select('*').eq('active', true).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPromotions(data); });
  }, []);

  return (
    <div className="page-container animate-fade-in">
      <div className="services-header">
        <h1 className="section-title">Our Services</h1>
        <p className="services-subtitle">
          Professional tech support delivered right to you in Confluence, PA.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ─── SERVICE CATEGORIES (collapsible) ─── */}
        <div style={{ flex: '1 1 100%' }}>
          <div className="categories-list">
            {promotions.length > 0 && (
              <CategoryBlock cat={{
                name: "Current Promotions",
                icon: Tag,
                items: promotions.map(p => {
                  const parts = (p.description || '').split('|||');
                  let promoId = `promo-${encodeURIComponent(p.title)}`;
                  if (p.title.toLowerCase().includes('audit')) promoId = 'cost-saving-audit';
                  if (p.title.toLowerCase().includes('landline')) promoId = 'landline-to-mobile';
                  
                  return {
                    id: promoId,
                    title: p.title,
                    detail: parts[0].trim(),
                    price: parts.length > 1 ? parts[1].trim() : null
                  };
                })
              }} />
            )}
            {serviceCategories.map((cat, catIdx) => (
              <CategoryBlock key={catIdx} cat={cat} />
            ))}
          </div>
        </div>
      </div>

      <div className="services-cta glass-panel text-center">
        <h2>Don't see what you need?</h2>
        <p>We offer customized solutions for unique tech problems.</p>
        <Link to="/request-info" className="button mt-4">Request Information <ChevronRight size={18}/></Link>
      </div>
    </div>
  );
}
