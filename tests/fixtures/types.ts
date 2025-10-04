export type WeddingFixture = {
  evento: {
    nome: string;
    tipo: string;
    data: string;
    hora: string;
    local: string;
    endereco: {
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      uf: string;
      complemento: string;
    };
    anfitriao: {
      nome: string;
      telefone: string;
      redeSocial: string;
      endCorrespondencia: {
        cep: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cidade: string;
        uf: string;
        complemento: string;
      };
      endEntrega: {
        cep: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cidade: string;
        uf: string;
        complemento: string;
      };
    };
  };
  cerimonialista: {
    nomeCompleto: string;
    telefone: string;
    redeSocial: string;
  };
};
