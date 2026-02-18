import { supabase } from "./supabase.js";

const BASE_PATH = "/oficina-do-minuto/";

// ===============================
// Elementos do DOM
// ===============================
const form = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const loader = document.getElementById("loader");

// ===============================
// Mapeamento de Perfis
// ===============================
const rolesMap = [
  { pattern: /^admin@minuto\.com$/i, page: "admin.html" },
  { pattern: /^loja\d+@minuto\.com$/i, page: "pedidos.html" },
  { pattern: /^transporte\d*@minuto\.com$/i, page: "transporte.html" },
  { pattern: /^financeiro@minuto\.com$/i, page: "financeiro.html" },
  { pattern: /^gerente\d*@minuto\.com$/i, page: "gerente.html" }
];

// ===============================
// Utilidades
// ===============================
const toggleLoader = (show) => {
  if (!loader) return;
  loader.style.display = show ? "flex" : "none";
};

const showError = (message) => {
  alert(message); // Pode substituir futuramente por toast mais bonito
};

const validateEmail = (email) => {
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  return emailRegex.test(email);
};

const getRedirectPage = (email) => {
  const role = rolesMap.find(r => r.pattern.test(email));
  return role ? role.page : "pedidos.html"; // Página padrão
};

// ===============================
// Evento de Login
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim().toLowerCase();
  const senha = senhaInput.value.trim();

  if (!email || !senha) {
    return showError("Preencha email e senha!");
  }

  if (!validateEmail(email)) {
    return showError("Email inválido!");
  }

  try {
    toggleLoader(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) throw error;
    if (!data?.user) throw new Error("Usuário não encontrado!");

    console.log("Login realizado com sucesso:", data.user.email);

    const redirectPage = getRedirectPage(data.user.email);

    window.location.href = BASE_PATH + redirectPage;

  } catch (err) {
    console.error("Erro no login:", err);
    showError(err.message || "Erro inesperado ao fazer login.");
  } finally {
    toggleLoader(false);
  }
});
