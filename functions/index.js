const functions = require("firebase-functions");
var admin = require("firebase-admin");
var serviceAccount = require("./permissions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const express = require("express");
const app = express();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const cors = require("cors");
app.use(cors({ origin: true }));

// Middleware para verificar o token do usuário
const validateToken = async (req, res, next) => {
  const idToken = req.headers.authorization && req.headers.authorization.split('Bearer ')[1];

  if (!idToken) {
    return res.status(401).send('Unauthorized: No token provided');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.log("Token inválido:", error);
    return res.status(401).send('Unauthorized: Invalid token');
  }
};

// Rota para listar funcionários
app.get("/listar-funcionarios", async (req, res) => {
  try {
    const funcionariosRef = db.collection("funcionarios");
    const snapshot = await funcionariosRef.get();
    const funcionarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(funcionarios);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Rota para detalhar um funcionário específico
app.get("/detalhar-funcionario/:id", validateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const funcionarioDoc = await db.collection("funcionarios").doc(id).get();
    if (!funcionarioDoc.exists) {
      return res.status(404).send("Funcionário não encontrado");
    }
    return res.status(200).json({ id: funcionarioDoc.id, ...funcionarioDoc.data() });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Rota para cadastrar funcionário
app.post("/cadastrar-funcionario", validateToken, (req, res) => {
  (async () => {
    try {
      await db.collection('funcionarios').add({
        nome: req.body.nome,
        sexo: req.body.sexo,
        endereco: req.body.endereco,
        telefone: req.body.telefone,
        dataAniversario: req.body.dataAniversario,
        cargo: req.body.cargo,
        dataAdmissao: req.body.dataAdmissao,
        setor: req.body.setor,
        salario: req.body.salario,
        fotoPerfil: req.body.fotoPerfil,
      });
      return res.status(200).send();
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// Exportar a API para o Firebase Functions
exports.app = functions.https.onRequest(app);
