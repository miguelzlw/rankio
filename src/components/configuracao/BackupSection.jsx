import { useState, useRef, useEffect } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import { exportarJSON, importarJSON, resetTotal, validarBackup } from '../../services/backup.js';

export default function BackupSection() {
  const [importando, setImportando] = useState(null);
  const [erroImport, setErroImport] = useState(null);
  const [confirmandoImport, setConfirmandoImport] = useState(false);
  const [resetEtapa, setResetEtapa] = useState(0); // 0=fechado, 1, 2, 3
  const [textoConfirma, setTextoConfirma] = useState('');
  const [contagem, setContagem] = useState(5);
  const [trabalhando, setTrabalhando] = useState(false);
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  function abrirImport() {
    fileRef.current?.click();
  }

  async function handleArquivo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const texto = await f.text();
      const payload = JSON.parse(texto);
      const erro = validarBackup(payload);
      if (erro) {
        setErroImport(erro);
        return;
      }
      setImportando(payload);
      setConfirmandoImport(true);
    } catch (err) {
      setErroImport('Não consegui ler o JSON: ' + err.message);
    } finally {
      e.target.value = '';
    }
  }

  async function executarImport() {
    setConfirmandoImport(false);
    if (!importando) return;
    setTrabalhando(true);
    try {
      await importarJSON(importando);
    } catch (err) {
      setErroImport('Erro na importação: ' + err.message);
    } finally {
      setImportando(null);
      setTrabalhando(false);
    }
  }

  function abrirReset() {
    setResetEtapa(1);
    setTextoConfirma('');
    setContagem(5);
  }

  function fecharReset() {
    setResetEtapa(0);
    setTextoConfirma('');
    setContagem(5);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (resetEtapa !== 3) return;
    setContagem(5);
    timerRef.current = setInterval(() => {
      setContagem((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          executarReset();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetEtapa]);

  async function executarReset() {
    setTrabalhando(true);
    try {
      await resetTotal();
    } finally {
      setTrabalhando(false);
      setResetEtapa(0);
      setTextoConfirma('');
    }
  }

  return (
    <section>
      <h2 className="font-semibold mb-3">Backup</h2>
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => exportarJSON()}
          disabled={trabalhando}
        >
          <Download size={16} /> Exportar JSON
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={abrirImport}
          disabled={trabalhando}
        >
          <Upload size={16} /> Importar JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleArquivo}
        />
        <Button
          variant="danger"
          className="w-full"
          onClick={abrirReset}
          disabled={trabalhando}
        >
          <AlertTriangle size={16} /> Reset total
        </Button>
      </div>

      {/* Confirmacao de importacao */}
      <Modal
        open={confirmandoImport}
        onClose={() => setConfirmandoImport(false)}
        title="Confirmar importação"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmandoImport(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={executarImport}>
              Importar e sobrescrever
            </Button>
          </>
        }
      >
        {importando && (
          <div className="space-y-2 text-sm">
            <p>O snapshot importado contém:</p>
            <ul className="list-disc list-inside text-slate-300">
              <li>{importando.times?.length ?? 0} times</li>
              <li>{importando.esportes?.length ?? 0} esportes</li>
              <li>{importando.jogos?.length ?? 0} jogos</li>
            </ul>
            <p className="text-amber-400 font-medium">
              Todos os dados atuais serão APAGADOS antes de importar.
            </p>
          </div>
        )}
      </Modal>

      <Modal open={!!erroImport} onClose={() => setErroImport(null)} title="Erro">
        <p>{erroImport}</p>
      </Modal>

      {/* Reset etapa 1 */}
      <Modal
        open={resetEtapa === 1}
        onClose={fecharReset}
        title="Reset total"
        footer={
          <>
            <Button variant="ghost" onClick={fecharReset}>Cancelar</Button>
            <Button variant="danger" onClick={() => setResetEtapa(2)}>
              Continuar
            </Button>
          </>
        }
      >
        <p>Isso apaga TODOS os times, esportes e jogos. Não tem volta.</p>
      </Modal>

      {/* Reset etapa 2 */}
      <Modal
        open={resetEtapa === 2}
        onClose={fecharReset}
        title="Confirmação 2 de 3"
        footer={
          <>
            <Button variant="ghost" onClick={fecharReset}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => setResetEtapa(3)}
              disabled={textoConfirma !== 'RESETAR'}
            >
              Continuar
            </Button>
          </>
        }
      >
        <p className="text-sm mb-3">
          Digite <code className="bg-black/30 px-2 py-0.5 rounded">RESETAR</code> para confirmar:
        </p>
        <input
          type="text"
          value={textoConfirma}
          onChange={(e) => setTextoConfirma(e.target.value)}
          className="w-full border border-white/20 bg-black/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          autoFocus
        />
      </Modal>

      {/* Reset etapa 3: contagem regressiva */}
      <Modal open={resetEtapa === 3} onClose={fecharReset} title="Apagando em..." dismissable={false}>
        <div className="text-center py-4">
          <p className="text-6xl font-bold text-red-500 tabular-nums mb-4">{contagem}</p>
          <Button variant="ghost" onClick={fecharReset}>Cancelar</Button>
        </div>
      </Modal>
    </section>
  );
}
