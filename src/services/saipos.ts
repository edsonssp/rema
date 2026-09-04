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

    const token = await getSaiposToken();

    const isDelivery = orderData.clientInfo?.deliveryType === 'delivery';

    // Mapeamento baseado na documentação oficial da Saipos
    const saiposPayload = {
      order_id: orderData.id || orderData._id?.toString(),
      display_id: orderData.id ? orderData.id.toString().substring(0, 5) : orderData._id?.toString().substring(0, 5),
      cod_store: SAIPOS_CONFIG.storeId,
      created_at: new Date().toISOString(),
      notes: orderData.notes || "",
      total_amount: orderData.total,
      total_discount: 0,
      total_increase: 0,
      customer: {
        id: "-1", // -1 para cliente não identificado/sem cadastro prévio
        name: orderData.clientInfo?.name || "Cliente sem nome",
        phone: orderData.clientInfo?.phone || "00000000000",
      },
      order_method: {
        mode: isDelivery ? "DELIVERY" : "TAKEOUT",
        ...(isDelivery ? {
          delivery_by: "RESTAURANT",
          delivery_fee: orderData.deliveryFee || 0,
        } : {}),
        scheduled: false
      },
      ...(isDelivery ? {
        delivery_address: {
          country: "BR",
          state: "PR", // Exemplo fixo, deve ser ajustado com dados reais
          city: "Curitiba", // Exemplo fixo, deve ser ajustado com dados reais
          street_name: orderData.clientInfo?.address || "Endereço não informado",
          street_number: "S/N"
        }
      } : {}),
      items: (orderData.items || []).map((item: any) => ({
        integration_code: item.id || Math.random().toString(36).substring(7),
        desc_item: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        notes: item.options?.join(", ") || "",
        choice_items: [] // Opcionais se tiver
      })),
      payment_types: [
        {
          code: orderData.paymentMethod === "Pix" ? "PIX" : "DIN", // PIX, DIN, CAR, etc.
          amount: orderData.total,
          change_for: 0
        }
      ]
    };

    console.log(`[Saipos] Disparando requisição para ${SAIPOS_CONFIG.baseUrl}/order...`);
    
    const response = await fetch(`${SAIPOS_CONFIG.baseUrl}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token 
      },
      body: JSON.stringify(saiposPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saipos] Falha ao enviar pedido:", errorText);
      throw new Error("Erro na API da Saipos: " + errorText);
    }

    const data = await response.json();
    console.log("[Saipos] Pedido enviado com sucesso! Retorno da Saipos:", data);
    return data;


  } catch (error) {
    console.error("[Saipos] Erro na função sendOrderToSaipos:", error);
    // Não vamos estourar o erro no começo para não quebrar a venda original
    return { success: false, error }; 
  }
}
