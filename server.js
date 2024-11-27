require("dotenv").config(); // Importa dotenv e carrega variáveis de ambiente

const express = require("express");
const bodyParser = require("body-parser");
const {
    Pool
} = require("pg");
const cors = require("cors");

const app = express();

// Use a porta definida nas variáveis de ambiente ou um padrão
const port = process.env.PORT || 3001;

// Configurar middleware
app.use(bodyParser.json());
app.use(cors());

// Configuração do banco de dados PostgreSQL usando variáveis de ambiente
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Verificar conexão ao banco de dados
pool
    .connect()
    .then((client) => {
        console.log("Conexão com o banco de dados bem-sucedida!");
        client.release(); // Libera o cliente para o pool
    })
    .catch((err) => {
        console.error("Erro ao conectar ao banco de dados:", err);
        process.exit(1); // Encerra o processo se não conseguir conectar ao banco
    });

// Rota para cadastro
app.post("/register", async (req, res) => {
    const {
        name,
        email,
        password
    } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Dados incompletos.",
        });
    }

    try {
        // Verifica se o email já existe no banco de dados
        const emailExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (emailExists.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email já cadastrado.",
            });
        }

        // Insere o novo usuário
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
            [name, email, password]
        );

        return res.json({
            success: true,
            userId: newUser.rows[0].id,
        });
    } catch (error) {
        console.error("Erro ao salvar no banco:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
});

app.post("/login", async (req, res) => {
    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email e senha são obrigatórios.",
        });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 AND password = $2",
            [email, password]
        );

        if (result.rows.length > 0) {
            res.json({
                success: true,
                user: result.rows[0],
            });
        } else {
            res.status(401).json({
                message: "Credenciais inválidas.",
            });
        }
    } catch (error) {
        console.error("Erro ao autenticar:", error);
        res.status(500).json({
            message: "Erro no servidor.",
        });
    }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});