import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Eye, Stethoscope, Activity, ClipboardList, X } from 'lucide-react';
import { clinicalService } from '../services/clinicalService';

export const ClinicalRecordTab = ({ patientId, triggerToast }) => {
  const { currentUser } = useAuth();
  const [encounters, setEncounters] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [viewEncounter, setViewEncounter] = useState(null);

  // Form states
  const [anamnesis, setAnamnesis] = useState({ queixaPrincipal: '', historicoFamiliar: '', doencasSistemicas: '', medicamentos: '' });
  const [acuity, setAcuity] = useState({ od_cc: '', od_sc: '', oe_cc: '', oe_sc: '' });
  const [tonometry, setTonometry] = useState({ od_pressure: '', oe_pressure: '', time: '' });
  const [refraction, setRefraction] = useState({ od_sph: '', od_cyl: '', od_axis: '', oe_sph: '', oe_cyl: '', oe_axis: '', add: '' });
  const [diagnosis, setDiagnosis] = useState({ cid: '', conduta: '', obs_gerais: '' });

  const [examForm, setExamForm] = useState({ exam_type: 'Campo Visual', results: '', conclusion: '' });

  const loadClinicalData = useCallback(async () => {
    if (!patientId) {
      setEncounters([]);
      setExams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [encData, examData] = await Promise.all([
        clinicalService.getPatientEncounters(patientId),
        clinicalService.getPatientExams(patientId)
      ]);
      setEncounters(encData);
      setExams(examData);
    } catch (err) {
      console.error(err);
      triggerToast && triggerToast('Erro ao carregar prontuário');
    } finally {
      setLoading(false);
    }
  }, [patientId, triggerToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadClinicalData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadClinicalData]);

  const handleSaveEncounter = async (e) => {
    e.preventDefault();
    try {
      await clinicalService.createEncounter({
        patient_id: patientId,
        professional_id: currentUser.id,
        shop_id: currentUser.shopId === 'all' ? null : currentUser.shopId,
        anamnesis,
        visual_acuity: acuity,
        tonometry,
        refraction,
        diagnosis
      });
      triggerToast && triggerToast('Atendimento salvo com sucesso!');
      setShowEncounterModal(false);
      
      // Reset form
      setAnamnesis({ queixaPrincipal: '', historicoFamiliar: '', doencasSistemicas: '', medicamentos: '' });
      setAcuity({ od_cc: '', od_sc: '', oe_cc: '', oe_sc: '' });
      setTonometry({ od_pressure: '', oe_pressure: '', time: '' });
      setRefraction({ od_sph: '', od_cyl: '', od_axis: '', oe_sph: '', oe_cyl: '', oe_axis: '', add: '' });
      setDiagnosis({ cid: '', conduta: '', obs_gerais: '' });

      loadClinicalData();
    } catch (err) {
      console.error(err);
      triggerToast && triggerToast('Erro ao salvar atendimento');
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    try {
      await clinicalService.createExam({
        patient_id: patientId,
        professional_id: currentUser.id,
        shop_id: currentUser.shopId === 'all' ? null : currentUser.shopId,
        exam_type: examForm.exam_type,
        results: examForm.results,
        conclusion: examForm.conclusion
      });
      triggerToast && triggerToast('Exame salvo com sucesso!');
      setShowExamModal(false);
      setExamForm({ exam_type: 'Campo Visual', results: '', conclusion: '' });
      loadClinicalData();
    } catch (err) {
      console.error(err);
      triggerToast && triggerToast('Erro ao salvar exame');
    }
  };

  if (loading) return <div>Carregando prontuário...</div>;

  return (
    <div className="clinical-record-tab">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3><Stethoscope size={20} /> Histórico Clínico e Exames</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setShowExamModal(true)}>
            <Activity size={16} /> Anexar Exame
          </button>
          <button className="btn btn-primary" onClick={() => setShowEncounterModal(true)}>
            <Plus size={16} /> Novo Atendimento
          </button>
        </div>
      </div>

      <div className="clinical-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {encounters.length === 0 && exams.length === 0 && (
          <div className="empty-state">Nenhum registro clínico encontrado para este paciente.</div>
        )}
        
        {encounters.map(enc => (
          <div key={enc.id} className="clinical-card" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={18} color="var(--primary)" /> 
                  Atendimento Clínico
                </h4>
                <small style={{ color: 'var(--text-muted)' }}>
                  {new Date(enc.date).toLocaleString('pt-BR')}
                </small>
              </div>
              <button className="btn-icon" title="Ver detalhes completos" onClick={() => setViewEncounter(enc)}>
                <Eye size={18} />
              </button>
            </div>
            
            {enc.anamnesis?.queixaPrincipal && (
              <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                <strong>Queixa Principal:</strong> {enc.anamnesis.queixaPrincipal}
              </div>
            )}
            
            {enc.diagnosis?.conduta && (
              <div style={{ fontSize: '13px', background: 'var(--bg-color)', padding: '8px', borderRadius: '4px' }}>
                <strong>Conduta:</strong> {enc.diagnosis.conduta}
              </div>
            )}
          </div>
        ))}

        {exams.map(ex => (
          <div key={ex.id} className="clinical-card" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="var(--accent)" /> 
                  Exame: {ex.exam_type}
                </h4>
                <small style={{ color: 'var(--text-muted)' }}>
                  {new Date(ex.date).toLocaleString('pt-BR')}
                </small>
              </div>
            </div>
            
            {ex.results && (
              <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                <strong>Resultados:</strong> {ex.results}
              </div>
            )}
            
            {ex.conclusion && (
              <div style={{ fontSize: '13px', background: 'var(--bg-color)', padding: '8px', borderRadius: '4px' }}>
                <strong>Conclusão:</strong> {ex.conclusion}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Novo Atendimento */}
      {showEncounterModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Novo Atendimento Clínico</h2>
              <button className="btn" onClick={() => setShowEncounterModal(false)} style={{ padding: '4px', background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEncounter}>
              <div className="form-section">
                <h4>Anamnese</h4>
                <div className="form-group">
                  <label>Queixa Principal</label>
                  <textarea className="form-control" value={anamnesis.queixaPrincipal} onChange={e => setAnamnesis({...anamnesis, queixaPrincipal: e.target.value})} rows={2}></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Histórico Familiar</label>
                    <input type="text" className="form-control" value={anamnesis.historicoFamiliar} onChange={e => setAnamnesis({...anamnesis, historicoFamiliar: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Doenças Sistêmicas (ex: DM, HAS)</label>
                    <input type="text" className="form-control" value={anamnesis.doencasSistemicas} onChange={e => setAnamnesis({...anamnesis, doencasSistemicas: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Medicamentos em Uso</label>
                  <input type="text" className="form-control" value={anamnesis.medicamentos} onChange={e => setAnamnesis({...anamnesis, medicamentos: e.target.value})} />
                </div>
              </div>

              <div className="form-section" style={{ marginTop: '20px' }}>
                <h4>Exame Físico (Acuidade e Tonometria)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Acuidad. OD (cc)</label>
                    <input type="text" className="form-control" value={acuity.od_cc} onChange={e => setAcuity({...acuity, od_cc: e.target.value})} placeholder="ex: 20/20" />
                  </div>
                  <div className="form-group">
                    <label>Acuidad. OE (cc)</label>
                    <input type="text" className="form-control" value={acuity.oe_cc} onChange={e => setAcuity({...acuity, oe_cc: e.target.value})} placeholder="ex: 20/20" />
                  </div>
                  <div className="form-group">
                    <label>Tono OD (mmHg)</label>
                    <input type="text" className="form-control" value={tonometry.od_pressure} onChange={e => setTonometry({...tonometry, od_pressure: e.target.value})} placeholder="ex: 14" />
                  </div>
                  <div className="form-group">
                    <label>Tono OE (mmHg)</label>
                    <input type="text" className="form-control" value={tonometry.oe_pressure} onChange={e => setTonometry({...tonometry, oe_pressure: e.target.value})} placeholder="ex: 15" />
                  </div>
                </div>
              </div>

              <div className="form-section" style={{ marginTop: '20px' }}>
                <h4>Refração (Para Registro no Prontuário)</h4>
                <div className="form-row">
                  <div className="form-group"><label>OD Esférico</label><input type="text" className="form-control" value={refraction.od_sph} onChange={e=>setRefraction({...refraction, od_sph: e.target.value})}/></div>
                  <div className="form-group"><label>OD Cilíndrico</label><input type="text" className="form-control" value={refraction.od_cyl} onChange={e=>setRefraction({...refraction, od_cyl: e.target.value})}/></div>
                  <div className="form-group"><label>OD Eixo</label><input type="text" className="form-control" value={refraction.od_axis} onChange={e=>setRefraction({...refraction, od_axis: e.target.value})}/></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>OE Esférico</label><input type="text" className="form-control" value={refraction.oe_sph} onChange={e=>setRefraction({...refraction, oe_sph: e.target.value})}/></div>
                  <div className="form-group"><label>OE Cilíndrico</label><input type="text" className="form-control" value={refraction.oe_cyl} onChange={e=>setRefraction({...refraction, oe_cyl: e.target.value})}/></div>
                  <div className="form-group"><label>OE Eixo</label><input type="text" className="form-control" value={refraction.oe_axis} onChange={e=>setRefraction({...refraction, oe_axis: e.target.value})}/></div>
                </div>
              </div>

              <div className="form-section" style={{ marginTop: '20px' }}>
                <h4>Diagnóstico e Conduta</h4>
                <div className="form-group">
                  <label>CID</label>
                  <input type="text" className="form-control" value={diagnosis.cid} onChange={e => setDiagnosis({...diagnosis, cid: e.target.value})} placeholder="ex: H52.1" />
                </div>
                <div className="form-group">
                  <label>Conduta Terapêutica</label>
                  <textarea className="form-control" value={diagnosis.conduta} onChange={e => setDiagnosis({...diagnosis, conduta: e.target.value})} rows={2}></textarea>
                </div>
                <div className="form-group">
                  <label>Observações Gerais</label>
                  <textarea className="form-control" value={diagnosis.obs_gerais} onChange={e => setDiagnosis({...diagnosis, obs_gerais: e.target.value})} rows={2}></textarea>
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEncounterModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Prontuário</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Exame */}
      {showExamModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Registrar Exame</h2>
              <button className="btn" onClick={() => setShowExamModal(false)} style={{ padding: '4px', background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveExam}>
              <div className="form-group">
                <label>Tipo de Exame</label>
                <select className="form-control" value={examForm.exam_type} onChange={e => setExamForm({...examForm, exam_type: e.target.value})}>
                  <option value="Campo Visual">Campo Visual</option>
                  <option value="Topografia Corneana">Topografia Corneana</option>
                  <option value="Mapeamento de Retina">Mapeamento de Retina</option>
                  <option value="Retinografia">Retinografia</option>
                  <option value="OCT">OCT</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Resultados Descritivos</label>
                <textarea className="form-control" value={examForm.results} onChange={e => setExamForm({...examForm, results: e.target.value})} rows={3}></textarea>
              </div>
              <div className="form-group">
                <label>Conclusão / Laudo</label>
                <textarea className="form-control" value={examForm.conclusion} onChange={e => setExamForm({...examForm, conclusion: e.target.value})} rows={2}></textarea>
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExamModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Exame</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Detail */}
      {viewEncounter && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Detalhes do Atendimento</h2>
              <button className="btn" onClick={() => setViewEncounter(null)} style={{ padding: '4px', background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <p><strong>Data:</strong> {new Date(viewEncounter.date).toLocaleString('pt-BR')}</p>
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            
            <h5>Anamnese</h5>
            <p><strong>Queixa:</strong> {viewEncounter.anamnesis?.queixaPrincipal || '-'}</p>
            <p><strong>Histórico:</strong> {viewEncounter.anamnesis?.historicoFamiliar || '-'}</p>
            <p><strong>Doenças Sistêmicas:</strong> {viewEncounter.anamnesis?.doencasSistemicas || '-'}</p>
            <p><strong>Medicamentos:</strong> {viewEncounter.anamnesis?.medicamentos || '-'}</p>
            
            <h5 style={{ marginTop: '16px' }}>Físico / Tonometria</h5>
            <p><strong>Acuidade OD:</strong> {viewEncounter.visual_acuity?.od_cc} | <strong>OE:</strong> {viewEncounter.visual_acuity?.oe_cc}</p>
            <p><strong>Pressão OD:</strong> {viewEncounter.tonometry?.od_pressure} | <strong>OE:</strong> {viewEncounter.tonometry?.oe_pressure}</p>
            
            <h5 style={{ marginTop: '16px' }}>Diagnóstico</h5>
            <p><strong>CID:</strong> {viewEncounter.diagnosis?.cid || '-'}</p>
            <p><strong>Conduta:</strong> {viewEncounter.diagnosis?.conduta || '-'}</p>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewEncounter(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
