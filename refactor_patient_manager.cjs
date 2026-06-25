const fs = require('fs');
const path = require('path');

const patientManagerPath = path.join(__dirname, 'src/components/PatientManager.jsx');
let content = fs.readFileSync(patientManagerPath, 'utf8');

// Imports
content = content.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';");
content = content.replace("import PageHeader from './PageHeader';", "import { patientService } from '../services/patientService';\nimport { prescriptionService } from '../services/prescriptionService';\nimport { saleService } from '../services/saleService';\nimport PageHeader from './PageHeader';");

// States & useEffect
const statesString = `
  const [patientTimeline, setPatientTimeline] = useState([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [patientSales, setPatientSales] = useState([]);

  const loadPatientData = async (id) => {
    try {
      const timeline = await patientService.getTimelineEvents(id);
      const rx = await prescriptionService.getByPatient(id);
      const sales = await saleService.getByPatient(id);
      setPatientTimeline(timeline);
      setPatientPrescriptions(rx);
      setPatientSales(sales);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedPatient?.id) {
      loadPatientData(selectedPatient.id);
    } else {
      setPatientTimeline([]);
      setPatientPrescriptions([]);
      setPatientSales([]);
    }
  }, [selectedPatient?.id]);
`;

content = content.replace("const selectedPatientAge = getPatientAge(selectedPatient?.birthDate);", statesString + "\n  const selectedPatientAge = getPatientAge(selectedPatient?.birthDate);");

// Replace selectedPatient.timeline -> patientTimeline
content = content.replace(/selectedPatient\.timeline/g, "patientTimeline");
// Remove updatePatient from addRx and addPurchase logic since they're separate now
// Actually it's easier to just rewrite handleAddRx and handleAddPurchase
const handleAddRxOld = `  const handleAddRx = (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    addPrescription(selectedPatient.id, newRx);
    setShowRxForm(false);
    setNewRx({
      doctor: professionals[0]?.name || '',
      longe: {
        od: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' },
        oe: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' }
      },
      perto: {
        od: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' },
        oe: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' }
      },
      adicao: '',
      notes: ''
    });
  };`;

const handleAddRxNew = `  const handleAddRx = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    
    try {
      await prescriptionService.create({
        patientId: selectedPatient.id,
        professionalId: professionals.find(p => p.name === newRx.doctor)?.id || null,
        date: new Date().toISOString().split('T')[0],
        notes: newRx.notes,
        shop_id: selectedPatient.shop_id
      });
      await patientService.addTimelineEvent({
        patientId: selectedPatient.id,
        type: 'prescription',
        title: 'Receita Oftalmológica Emitida',
        description: \`Emitida por Dr(a). \${newRx.doctor}.\`,
        shop_id: selectedPatient.shop_id,
        date: new Date().toISOString().split('T')[0]
      });
      loadPatientData(selectedPatient.id);
      
      setShowRxForm(false);
      setNewRx({
        doctor: professionals[0]?.name || '',
        longe: {
          od: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' },
          oe: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' }
        },
        perto: {
          od: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' },
          oe: { esferico: '', cilindrico: '', eixo: '', dnp: '', av: '' }
        },
        adicao: '',
        notes: ''
      });
    } catch(e) { console.error(e); }
  };`;

content = content.replace(handleAddRxOld, handleAddRxNew);

const handleAddPurchaseOld = `  const handleAddPurchase = (e) => {
    e.preventDefault();
    if (!selectedPatient || !newPurchase.item || !newPurchase.value) return;
    const osNum = newPurchase.osNumber || \`OS-\${uuidv4().substring(0, 8)}\`;
    addPurchase(selectedPatient.id, {
      ...newPurchase,
      osNumber: osNum
    });
    setShowPurchaseForm(false);
    setNewPurchase({ osNumber: '', item: '', value: '' });
  };`;

const handleAddPurchaseNew = `  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !newPurchase.item || !newPurchase.value) return;
    
    try {
      const sale = await saleService.createSaleWithItems({
        patientId: selectedPatient.id,
        professionalId: currentUser?.id,
        date: new Date().toISOString().split('T')[0],
        totalAmount: parseFloat(newPurchase.value),
        shop_id: selectedPatient.shop_id
      }, [{
        type: 'service',
        description: newPurchase.item,
        quantity: 1,
        unitPrice: parseFloat(newPurchase.value),
        totalPrice: parseFloat(newPurchase.value),
        shop_id: selectedPatient.shop_id
      }]);
      
      await saleService.createOpticalOrder({
        saleId: sale.id,
        patientId: selectedPatient.id,
        status: 'producao',
        notes: newPurchase.osNumber || \`OS-\${uuidv4().substring(0, 8)}\`,
        shop_id: selectedPatient.shop_id
      });
      
      await patientService.addTimelineEvent({
        patientId: selectedPatient.id,
        type: 'purchase',
        title: \`Nova Venda/OS criada\`,
        description: \`Item: \${newPurchase.item} - Valor: R$ \${parseFloat(newPurchase.value).toFixed(2)}.\`,
        shop_id: selectedPatient.shop_id,
        date: new Date().toISOString().split('T')[0]
      });
      loadPatientData(selectedPatient.id);
      
      setShowPurchaseForm(false);
      setNewPurchase({ osNumber: '', item: '', value: '' });
    } catch(e) { console.error(e); }
  };`;

content = content.replace(handleAddPurchaseOld, handleAddPurchaseNew);

// Replace selectedPatient.prescriptions -> patientPrescriptions
content = content.replace(/selectedPatient\.prescriptions/g, "patientPrescriptions");
// Replace selectedPatient.purchases -> patientSales
content = content.replace(/selectedPatient\.purchases/g, "patientSales");
// Remove addPrescription, addPurchase, updatePurchaseStatus destructuring
content = content.replace(/addPrescription,\s*addPurchase,\s*updatePurchaseStatus,/g, "");

// Replace updatePurchaseStatus call in PatientManager
const updatePurchaseStatusOld = `onChange={(e) => updatePurchaseStatus(selectedPatient.id, pur.id, e.target.value)}`;
const updatePurchaseStatusNew = `onChange={async (e) => {
                                  try {
                                    await saleService.updateSaleStatus(pur.id, e.target.value);
                                    loadPatientData(selectedPatient.id);
                                  } catch(e) { console.error(e); }
                                }}`;
content = content.replace(updatePurchaseStatusOld, updatePurchaseStatusNew);

fs.writeFileSync(patientManagerPath, content);
console.log("PatientManager.jsx refactored");
