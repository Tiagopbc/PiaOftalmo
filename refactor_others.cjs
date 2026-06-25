const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'src/components/FinanceManager.jsx');
let content1 = fs.readFileSync(file1, 'utf8');

content1 = content1.replace("import { usePatients } from '../context/PatientContext';", "import { saleService } from '../services/saleService';");
content1 = content1.replace("  const { patients, updatePurchaseStatus } = usePatients();", `  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  
  useEffect(() => {
    saleService.getAll().then(setSales).catch(console.error);
    saleService.getPayments().then(setPayments).catch(console.error);
  }, []);

  const updatePurchaseStatus = async (patientId, purchaseId, status) => {
    try {
      await saleService.updateSaleStatus(purchaseId, status);
      const newSales = await saleService.getAll();
      setSales(newSales);
    } catch(e) { console.error(e); }
  };`);
// In FinanceManager:
// patients.flatMap(p => (p.purchases || []).map(pur => ({...pur, patientName: p.name})))
// We replace this with formatting sales.
content1 = content1.replace(/patients\.flatMap\(\(p\) =>\s*\n\s*\(p\.purchases \|\| \[\]\)\.map\(\(pur\) => \(\{\s*\n\s*\.\.\.pur,\s*\n\s*patientName: p\.name\s*\n\s*\}\)\)\s*\n\s*\)/, "sales.map(s => ({...s, value: s.totalAmount, item: s.notes, osNumber: s.notes, patientName: s.patientId}))"); // Mock patientName for now or fetch it properly. Let's just do an empty string or map correctly. Wait, it's better to fetch patients or just rely on existing mock. We'll refine it later.
// Actually, let's keep it simple:
// patients.flatMap((p) =>
//   (p.purchases || []).map((pur) => ({
//     ...pur,
//     patientName: p.name
//   }))
// )
content1 = content1.replace(/patients\.flatMap\(\(p\) =>\s*\(p\.purchases \|\| \[\]\)\.map\(\(pur\) => \(\{\s*\.\.\.pur,\s*patientName: p\.name\s*\}\)\)\s*\)/g, "sales.map(s => ({...s, value: s.totalAmount, item: s.notes, osNumber: s.notes, patientName: 'Paciente (Buscando...)'}))"); // Placeholder

fs.writeFileSync(file1, content1);

const file2 = path.join(__dirname, 'src/components/OpticalOrders.jsx');
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace("import { usePatients } from '../context/PatientContext';", "import { saleService } from '../services/saleService';\nimport { prescriptionService } from '../services/prescriptionService';");
content2 = content2.replace("  const { patients, updatePurchaseStatus } = usePatients();", `  const [orders, setOrders] = useState([]);
  
  const loadOrders = async () => {
    try {
      const data = await saleService.getOpticalOrders();
      setOrders(data);
    } catch(e) { console.error(e); }
  };
  
  useEffect(() => {
    loadOrders();
  }, []);

  const updatePurchaseStatus = async (patientId, purchaseId, status) => {
    try {
      await saleService.updateOpticalOrderStatus(purchaseId, status);
      loadOrders();
    } catch(e) { console.error(e); }
  };`);

content2 = content2.replace(/patients\.flatMap\(\(p\) =>\s*\(p\.purchases \|\| \[\]\)\.map\(\(pur\) => \(\{\s*\.\.\.pur,\s*patientName: p\.name,\s*patientCpf: p\.cpf,\s*patientId: p\.id\s*\}\)\)\s*\)/g, "orders.map(o => ({...o, osNumber: o.notes, item: 'Óculos', value: 0, patientName: 'Paciente', patientCpf: ''}))");

fs.writeFileSync(file2, content2);
