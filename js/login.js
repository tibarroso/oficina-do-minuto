import { supabase } from "./supabase.js";

const form = document.getElementById("formLogin");
const BASE_PATH = "/oficina-do-minuto/";

const rolesMap = [
  { pattern: /^admin@minuto\.com$/i, page: "admin.html" },
  { pattern: /^loja\d+@minuto\.com$/i, page: "pedidos.html" },
  { pattern: /^transporte\d*@minuto\.com$/i, page: "transporte.html" },
  { pattern: /^financeiro@minuto\.com$/i, page: "financeiro.html" },
  { pattern: /^gerente\d*@minuto\.com$/i, page: "gerente.html" }
];

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const emailInput = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!emailInput || !senha) {
    alert("Preencha email e senha!");
    return;
  }

  try {
    // 🔹 Login no Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: senha
    });

    if (error) throw error;
    if (!data.user) {
      alert("Usuário não encontrado!");
      return;
    }

    // 🔹 Pega o usuário logado diretamente do 'data'
    const email = data.user.email.trim().toLowerCase(); // Normaliza o email para evitar problemas de case-sensitive
    console.log("Email logado:", email); // debug

    // 🔹 Redirecionamento baseado no email
    const role = rolesMap.find(r => r.pattern.test(email));
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
  }
});
