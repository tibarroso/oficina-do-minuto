import { supabase } from "./supabase.js"; 

const form = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const BASE_PATH = "/oficina-do-minuto/";

// Mapa de papéis e páginas
const rolesMap = [
  { pattern: /^admin@minuto\.com$/i, page: "admin.html" },
  { pattern: /^loja\d+@minuto\.com$/i, page: "pedidos.html" },
  { pattern: /^transporte\d*@minuto\.com$/i, page: "transporte.html" },
  { pattern: /^financeiro@minuto\.com$/i, page: "financeiro.html" },
  { pattern: /^gerente\d*@minuto\.com$/i, page: "gerente.html" }
];

// Função para mostrar e esconder o loader
const toggleLoader = (isLoading) => {
  const loader = document.getElementById("loader");
  if (isLoading) {
    loader.style.display = "block"; // Mostra o loader
  } else {
    loader.style.display = "none"; // Esconde o loader
  }
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim().toLowerCase();
  const senha = senhaInput.value.trim();

  if (!email || !senha) {
    alert("Preencha email e senha!");
    return;
  }

  // Verifica o formato do email
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;
  if (!emailRegex.test(email)) {
    alert("Email inválido!");
    return;
  }

  try {
    // 🔹 Mostra o loader enquanto o login é processado
    toggleLoader(true);

    // 🔹 Login no Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) throw error;
    if (!data.user) {
      alert("Usuário não encontrado!");
      return;
    }

    // 🔹 Redirecionamento baseado no email
    const role = rolesMap.find(r => r.pattern.test(data.user.email));
    if (role) {
      // Redireciona para a página associada ao perfil
      window.location.href = BASE_PATH + role.page;
    } else {
      // Caso não encontre um perfil correspondente, redireciona para a página padrão (dashboard)
      window.location.href = BASE_PATH + "dashboard.html";
    }
  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro no login: " + (err.message || err));
  } finally {
    // 🔹 Esconde o loader após o processamento
    toggleLoader(false);
  }
});
