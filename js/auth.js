import { supabase } from "./supabase.js";

window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    alert("Preencha e-mail e senha.");
    return;
  }

  try {
    // Login com Supabase
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (loginError || !loginData.user) {
      alert("Login inválido");
      return;
    }

    // Buscar perfil do usuário
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", loginData.user.id)
      .single();

    if (userError || !userData) {
      alert("Erro ao buscar perfil do usuário");
      return;
    }

    // Armazena perfil localmente (pode ser usado em outros módulos)
    localStorage.setItem("perfil", userData.perfil);
    localStorage.setItem("email", loginData.user.email);

    // Redireciona para dashboard
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("Erro ao efetuar login:", err);
    alert("Erro inesperado ao tentar logar");
  }
};
