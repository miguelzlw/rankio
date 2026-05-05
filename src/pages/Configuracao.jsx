import TimesManager from '../components/configuracao/TimesManager.jsx';
import EsportesManager from '../components/configuracao/EsportesManager.jsx';
import JogosManager from '../components/configuracao/JogosManager.jsx';
import BackupSection from '../components/configuracao/BackupSection.jsx';

export default function Configuracao() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Configuração</h1>
      <TimesManager />
      <EsportesManager />
      <JogosManager />
      <BackupSection />
    </div>
  );
}
