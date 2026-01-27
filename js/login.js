import { supabase } from "./supabase.js";

const form = document.getElementById("formLogin");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    alert("Preencha email e senha!");
    return;
  }

  try {
    // Login no Supabase
    const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) throw error;
    if (!user) {
      alert("Usuário não encontrado!");
      return;
    }

    // Salvar sessão localmente se quiser (opcional)
    // localStorage.setItem("userEmail", user.email);

    // 🔹 Redirecionamento baseado no email
    if (user.email === "admin@minuto.com") {
      window.location.href = "admin.html";
    } else if (user.email.startsWith("loja")) {
      // todas as lojas com email tipo lojaX@minuto.com
      window.location.href = "pedidos.html";
    } else if (user.email.startsWith("transporte")) {
      window.location.href = "transporte.html";
    } else {
      // fallback
      window.location.href = "dashboard.html";
    }

  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro no login: " + (err.message || err));
  }
});
