import { supabase } from "./supabase.js";  // Importando o cliente Supabase

// ===============================
// Elementos do DOM
// ===============================
const form = document.getElementById("formLogin");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const loader = document.getElementById("loader");

// ===============================
// Mapeamento de Perfis (AJUSTADO PARA ROTAS DO NODE.JS)
// ===============================
const rolesMap = [
  { pattern: /^admin@minuto\.com$/i, route: "/admin" },
  { pattern: /^loja\d+@minuto\.com$/i, route: "/pedidos" },
  { pattern: /^transporte\d*@minuto\.com$/i, route: "/transporte" },
  { pattern: /^financeiro@minuto\.com$/i, route: "/financeiro" },
  { pattern: /^gerente\d*@minuto\.com$/i, route: "/gerente" }
];

// ===============================
// Utilidades
// ===============================
const toggleLoader = (show) => {
  if (!loader) return;
  loader.style.display = show ? "flex" : "none";
};

const showError = (message) => {
  alert(message); 
};

const validateEmail = (email) => {
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  return emailRegex.test(email);
};

const getRedirectRoute = (email) => {
  const role = rolesMap.find(r => r.pattern.test(email));
  return role ? role.route : "/pedidos"; // Rota padrão caso não case com nenhuma regex
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

    // Obtém a rota amigável do Express baseada no email do usuário
    const redirectRoute = getRedirectRoute(data.user.email);

    // AJUSTADO: Redirecionamento limpo enviado para o servidor Node.js
    window.location.href = redirectRoute;

  } catch (err) {
    console.error("Erro no login:", err);
    showError(err.message || "Erro inesperado ao fazer login.");
  } finally {
    toggleLoader(false);
  }
});
