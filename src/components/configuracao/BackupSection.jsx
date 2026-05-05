import { useState, useRef, useEffect } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import { exportarJSON, importarJSON, resetTotal, validarBackup } from '../../services/backup.js';

export default function BackupSection() {
  const [importando, setImportando] = useState(null);
  const [erroImport, setErroImport] = useState(null);
  const [confirmandoImport, setConfirmandoImport] = useState(false);
  const [resetEtapa, setResetEtapa] = useState(0);
  const [textoConfirma, setTextoConfirma] = useState('');
  const [contagem, setContagem] = useState(5);
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
    await importarJSON(importando);
    setImportando(null);
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
    if (timerRef.current) clearInterval(timerRef.current);
  }

  useEffect(() => {
    if (resetEtapa === 3) {
      setContagem(5);
      timerRef.current = setInterval(() => {
        setContagem((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current);
            executarReset();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetEtapa]);

  async function executarReset() {
    await resetTotal();
    fecharReset();
  }

  return (
    <section>
      <h2 className="font-semibold mb-3">Backup</h2>
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => exportarJSON()}
        >
          <Download size={16} /> Exportar JSON
        </Button>
        <Button variant="outline" className="w-full" onClick={abrirImport}>
          <Upload size={16} /> Importar JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleArquivo}
        />
        <Button variant="danger" className="w-full" onClick={abrirReset}>
          <AlertTriangle size={16} /> Reset total
        </Button>
      </div>

      <Modal
        open={confirmandoImport}
        onClose={() => setConfirmandoImport(false)}
        title="Confirmar importação"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmandoImport(false)}>Cancelar</Button>
            <Button variant="danger" onClick={executarImport}>Importar e sobrescrever</Button>
          </>
        }
      >
        {importando && (
          <div className="space-y-2 text-sm">
            <p>O snapshot importado contém:</p>
            <ul className="list-disc list-inside text-slate-700">
              <li>{importando.times?.length ?? 0} times</li>
              <li>{importando.esportes?.length ?? 0} esportes</li>
              <li>{importando.jogos?.length ?? 0} jogos</li>
            </ul>
            <p className="text-amber-700 font-medium">
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
            <Button variant="danger" onClick={() => setResetEtapa(2)}>Continuar</Button>
          </>
        }
      >
        <p>Isso apaga TODOS os times, esportes e jogos. Não tem volta.</p>
      </Modal>

      {/* Reset etapa 2 */}
      <Modal
        open={resetEtapa === 2}
        onClose={fecharReset}
        title="Confirmação 2/3"
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
        <p className="text-sm mb-3">Digite <code className="bg-slate-100 px-2 py-0.5 rounded">RESETAR</code> para confirmar:</p>
        <input
          type="text"
          value={textoConfirma}
          onChange={(e) => setTextoConfirma(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
          autoFocus
        />
      </Modal>

      {/* Reset etapa 3: contagem regressiva */}
      <Modal open={resetEtapa === 3} onClose={fecharReset} title="Apagando em..." dismissable={false}>
        <div className="text-center py-4">
          <p className="text-6xl font-bold text-red-600 tabular-nums mb-4">{contagem}</p>
          <Button variant="ghost" onClick={fecharReset}>Cancelar</Button>
        </div>
      </Modal>
    </section>
  );
}
