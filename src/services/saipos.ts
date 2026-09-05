import fetch from "node-fetch"; // or use native fetch in node 18+

// Configurações da Loja de Teste Saipos
export const SAIPOS_CONFIG = {
  publicKey: process.env.SAIPOS_PUBLIC_KEY || "d647e16ae694b09b57522bdd9dab4448",
  storeId: process.env.SAIPOS_STORE_ID || "94754",
  partnerId: process.env.SAIPOS_PARTNER_ID || "b63d6f22de009043b21dc6d410299bc8",
  baseUrl: process.env.SAIPOS_BASE_URL || "https://order-api.saipos.com",
  username: process.env.SAIPOS_USERNAME || "djedinhossp@gmail.com",
  password: process.env.SAIPOS_PASSWORD || "u#&W&slryOEFK2GK00ju",
  // Novos campos baseados na doc:
  authIdPartner: process.env.SAIPOS_AUTH_ID_PARTNER || "174b0de210d98ce317d7c76f9fc478a9",
  authSecret: process.env.SAIPOS_AUTH_SECRET || "1416cc518fe9ddeb4b254dc17703fde4",
};

// Variável para guardar o token em memória (evita fazer login a cada pedido)
let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Função para autenticar na Saipos e pegar o Bearer Token automaticamente
 */
async function getSaiposToken(): Promise<string> {
  // Se o token existe e ainda é válido (dando 5 minutos de margem de segurança)
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  console.log("[Saipos] Gerando novo token de autenticação...");
  const response = await fetch(`${SAIPOS_CONFIG.baseUrl}/auth`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      idPartner: SAIPOS_CONFIG.authIdPartner,
      secret: SAIPOS_CONFIG.authSecret
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[Saipos] Erro ao autenticar:", err);
    throw new Error("Falha na autenticação da Saipos: " + err);
  }

  const data = await response.json() as { token: string };
  cachedToken = data.token;
  
  // Vamos assumir que o token dura 24h caso a API não retorne a expiração
  tokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; 
  console.log("[Saipos] Novo token gerado com sucesso!");
  
  return cachedToken;
}

/**
 * Função esqueleto para enviar um pedido para a Saipos.
 * Assim que tivermos a documentação oficial da estrutura do JSON (payload),
 * vamos ajustar o mapeamento abaixo.
 */
export async function sendOrderToSaipos(orderData: any) {
  try {
    console.log("[Saipos] Preparando envio de pedido para a integração...");

    // Garante que temos um token válido antes de enviar o pedido
    // Descomente a linha abaixo quando for rodar de verdade:
    // const token = await getSaiposToken();

    // Mapeamento genérico (precisará ser ajustado conforme documentação da Saipos)
    const saiposPayload = {
      // Normalmente os sistemas de PDV pedem um ID de referência
      id_externo: orderData.id || orderData._id?.toString(),
      
      // ID da sua loja na Saipos
      loja_id: SAIPOS_CONFIG.storeId, 
      
      // Dados do Cliente
      cliente: {
        nome: orderData.clientInfo?.name || "Cliente Padrão",
        telefone: orderData.clientInfo?.phone || "00000000000",
      },

      // Endereço (se for delivery)
      endereco: {
        logradouro: orderData.clientInfo?.address || "",
        // numero, bairro, etc. (a ser detalhado)
      },

      // Itens do Pedido
      itens: (orderData.items || []).map((item: any) => ({
        id_externo: item.id,
        nome: item.name,
        quantidade: item.quantity,
        preco_unitario: item.price,
        // observacoes: item.options?.join(", ") || ""
      })),

      // Totais e Pagamento
      total_pedido: orderData.total,
      taxa_entrega: orderData.deliveryFee || 0,
      pagamento: {
        metodo: orderData.paymentMethod || "DINHEIRO",
        status: orderData.status === "paid" ? "PAGO" : "PENDENTE"
      },
      
      tipo_pedido: orderData.clientInfo?.deliveryType === "pickup" ? "RETIRADA" : "ENTREGA"
    };

    console.log(`[Saipos] Disparando requisição para ${SAIPOS_CONFIG.baseUrl}/pedidos...`);
    
    // Descomente e ajuste a chamada real quando a documentação for confirmada:
    /*
    const response = await fetch(`${SAIPOS_CONFIG.baseUrl}/pedidos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(saiposPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saipos] Falha ao enviar pedido:", errorText);
      throw new Error("Erro na API da Saipos: " + errorText);
    }

    const data = await response.json();
    console.log("[Saipos] Pedido enviado com sucesso! ID na Saipos:", data.id);
    return data;
    */
    
    // Retorno simulado para o ambiente de testes
    console.log("[Saipos] Simulação de envio concluída com sucesso! Payload gerado:", JSON.stringify(saiposPayload, null, 2));
    return { success: true, simulated: true, payload: saiposPayload };

  } catch (error) {
    console.error("[Saipos] Erro na função sendOrderToSaipos:", error);
    // Não vamos estourar o erro no começo para não quebrar a venda original
    return { success: false, error }; 
  }
}
