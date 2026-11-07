import { useCallback, useState } from 'react';
import RegistrationModal from '../components/RegistrationModal';
import SuccessModal from '../components/SuccessModal';
import TicketLookupModal from '../components/TicketLookupModal';
import CountdownBand from '../components/landing/CountdownBand';
import Footer from '../components/landing/Footer';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import PrizesSection from '../components/landing/PrizesSection';
import { useConfig } from '../hooks/useConfig';
import { useCountdown } from '../hooks/useCountdown';

export default function Home() {
  const config = useConfig();
  const countdown = useCountdown(config.registrationDeadline, config.offsetMs);
  const closed = countdown.expired;

  // Modal flow: 'closed' -> 'register' -> 'success' -> 'closed'
  const [modal, setModal] = useState('closed');
  const [ticket, setTicket] = useState(null);

  const openRegister = useCallback(() => {
    if (!closed) setModal('register');
  }, [closed]);

  const openLookup = useCallback(() => {
    setModal('lookup');
  }, []);

  const closeModal = useCallback(() => setModal('closed'), []);

  const handleRegistered = useCallback((data) => {
    setTicket(data); // { ticketNumber: 'KV-001', name, registeredAt }
    setModal('success'); // form modal closes, success modal opens
  }, []);

  return (
    <div className="min-h-screen">
      <Header onRegister={openRegister} onLookupTicket={openLookup} closed={closed} />
      <main>
        <Hero onRegister={openRegister} closed={closed} eventDate={config.eventDate} totalRegistered={config.totalRegistered} />
        <CountdownBand countdown={countdown} deadline={config.registrationDeadline} onRegister={openRegister} />
        <PrizesSection />
        <HowItWorks />
      </main>
      <Footer />

      <RegistrationModal open={modal === 'register'} onClose={closeModal} onSuccess={handleRegistered} />
      <TicketLookupModal open={modal === 'lookup'} onClose={closeModal} />
      <SuccessModal open={modal === 'success'} ticket={ticket} onClose={closeModal} />
    </div>
  );
}
