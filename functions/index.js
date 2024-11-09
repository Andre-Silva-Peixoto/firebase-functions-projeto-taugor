const functions = require("firebase-functions");
var admin = require("firebase-admin");
var serviceAccount = require("./permissions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'projeto-taugor-andrespx.firebasestorage.app',
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
    return res.status(401).send('Não autorizado: Não autenticado');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.log("Token inválido:", error);
    return res.status(401).send('Não autorizado: Autenticação invalida');
  }
};

// Rota para listar funcionários
app.get("/listar-funcionarios", validateToken, async (req, res) => {
  try {
    const funcionariosRef = db.collection("funcionarios");
    const snapshot = await funcionariosRef.get();
    const funcionarios = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        fotoPerfil: data.fotoPerfil,
        nome: data.nome,
        cargo: data.cargo,
        setor: data.setor,
        salario: data.salario
      };
    });
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
      const docRef = await db.collection('funcionarios').add({
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
        historico: []
      });
      return res.status(200).json({ id: docRef.id });
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// Rota para editar funcionário e adicionar histórico
app.put("/editar-funcionario/:id", validateToken, async (req, res) => {
  const { id } = req.params;
  const dadosAlterados = req.body;

  try {
    const funcionarioDoc = await db.collection("funcionarios").doc(id).get();
    if (!funcionarioDoc.exists) {
      return res.status(404).send("Funcionário não encontrado");
    }

    const funcionarioData = funcionarioDoc.data();

    const historicoItem = {
      data: new Date(),
      alteracoes: []
    };

    // Verificar as alterações feitas e adicionar ao histórico
    Object.keys(dadosAlterados).forEach((key) => {
      if (
        key !== "id" &&
        key !== "historico" &&
        key !== "ultimaAtualizacao" &&
        dadosAlterados[key] !== funcionarioData[key]
      ) {
        historicoItem.alteracoes.push({
          campo: key,
          valorAntigo: funcionarioData[key],
          valorNovo: dadosAlterados[key],
          dataAlteracao: new Date()
        });
      }
    });

    await db.collection("funcionarios").doc(id).update({
      ...dadosAlterados,
      historico: admin.firestore.FieldValue.arrayUnion(historicoItem),
      ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).send("Funcionário atualizado com sucesso");
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Rota para deletar um funcionário e seus arquivos associados
app.delete("/deletar-funcionario/:id", validateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Busca o documento do funcionário
    const funcionarioDoc = await db.collection("funcionarios").doc(id).get();
    if (!funcionarioDoc.exists) {
      return res.status(404).send("Funcionário não encontrado");
    }

    const funcionarioData = funcionarioDoc.data();
    
    // Extrair o caminho da foto de perfil
    const fotoPerfil = funcionarioData.fotoPerfil;
    const regex = /\/o\/(.*?)\?/;
    const fotoPerfilPathMatch = fotoPerfil.match(regex);
    const fotoPerfilPath = fotoPerfilPathMatch ? decodeURIComponent(fotoPerfilPathMatch[1]) : null;

    // Deletar o arquivo de foto de perfil no Firebase Storage
    if (fotoPerfilPath) {
      const storage = admin.storage().bucket();
      await storage.file(fotoPerfilPath).delete();
      console.log(`Foto de perfil ${fotoPerfilPath} deletada com sucesso`);
    }

    // Deletar arquivos associados no histórico, se houver
    const historico = funcionarioData.historico || [];
    for (const item of historico) {
      item.alteracoes.forEach(async (alteracao) => {
        if (alteracao.campo === "fotoPerfil") {
          const fotoPerfilHistorico = alteracao.valorAntigo;
          const fotoPerfilHistoricoPathMatch = fotoPerfilHistorico.match(regex);
          const fotoPerfilHistoricoPath = fotoPerfilHistoricoPathMatch ? decodeURIComponent(fotoPerfilHistoricoPathMatch[1]) : null;
          
          // Deletar os arquivos antigos de foto de perfil no Firebase Storage
          if (fotoPerfilHistoricoPath) {
            await storage.file(fotoPerfilHistoricoPath).delete();
            console.log(`Foto de perfil do histórico ${fotoPerfilHistoricoPath} deletada com sucesso`);
          }
        }
      });
    }

    // Deletar o documento do funcionário do Firestore
    await db.collection("funcionarios").doc(id).delete();
    
    return res.status(200).send("Funcionário e arquivos deletados com sucesso");
  } catch (error) {
    console.log(error);
    return res.status(500).send("Erro ao deletar o funcionário e arquivos");
  }
});

exports.app = functions.https.onRequest(app);
