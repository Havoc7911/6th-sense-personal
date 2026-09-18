import Navbar from './Navbar';
import Footer from './Footer';
import DataBanner from './DataBanner';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <DataBanner />
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}
