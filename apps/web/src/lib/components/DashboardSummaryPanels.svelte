<details id="secEvento">
  <summary>Evento</summary>
  <div class="details-wrap">
    <div class="twocol">
      <div class="field">
        <label for="evento-nome"><span class="small">Nome do evento</span></label>
        <input id="evento-nome" data-bind="evento.nome" type="text" />
      </div>
      <div class="field">
        <label for="evento-tipo"><span class="small">Tipo</span></label>
        <select id="evento-tipo" data-bind="evento.tipo">
          <option value=""></option>
          <option>Casamento</option>
          <option>Aniversário</option>
          <option>Formatura</option>
          <option>Debutante</option>
          <option>Corporativo</option>
          <option>Batizado</option>
          <option>Chá de Panela</option>
          <option>Chá de Bebê</option>
          <option>Bodas</option>
          <option>Outro</option>
        </select>
      </div>
    </div>

    <div class="twocol">
      <div class="field">
        <label for="ev-datetime"><span class="small">Quando</span></label>
        <input id="ev-datetime" type="datetime-local" />
      </div>
      <div class="field">
        <label for="evento-local"><span class="small">Local</span></label>
        <input id="evento-local" data-bind="evento.local" type="text" />
      </div>
    </div>

    <div><strong class="small">Endereço do evento</strong></div>

    <div class="twocol">
      <div class="field">
        <label for="evento-endereco-cep"><span class="small">CEP</span></label>
        <input
          id="evento-endereco-cep"
          data-bind="evento.endereco.cep"
          type="text"
          inputmode="numeric"
          maxlength="9"
          data-cep="evento.endereco"
        />
      </div>
      <div class="field">
        <label for="evento-endereco-logradouro"><span class="small">Logradouro</span></label>
        <input id="evento-endereco-logradouro" data-bind="evento.endereco.logradouro" type="text" />
      </div>
    </div>

    <div class="threecol">
      <div class="field">
        <label for="evento-endereco-numero"><span class="small">Número</span></label>
        <input id="evento-endereco-numero" data-bind="evento.endereco.numero" type="text" />
      </div>
      <div class="field">
        <label for="evento-endereco-bairro"><span class="small">Bairro</span></label>
        <input id="evento-endereco-bairro" data-bind="evento.endereco.bairro" type="text" />
      </div>
      <div class="field">
        <label for="evento-endereco-cidade"><span class="small">Cidade</span></label>
        <input id="evento-endereco-cidade" data-bind="evento.endereco.cidade" type="text" />
      </div>
    </div>

    <div class="twocol">
      <div class="field">
        <label for="evento-endereco-uf"><span class="small">UF</span></label>
        <input id="evento-endereco-uf" data-bind="evento.endereco.uf" type="text" maxlength="2" />
      </div>
      <div class="field">
        <label for="evento-endereco-complemento"><span class="small">Complemento / Referência</span></label>
        <input id="evento-endereco-complemento" data-bind="evento.endereco.complemento" type="text" />
      </div>
    </div>

    <div class="close-hint">Pressione <strong>Esc</strong> ou clique no lápis novamente para fechar.</div>
  </div>
</details>

<details id="secAnfitriao">
  <summary>Anfitrião</summary>
  <div class="details-wrap">
    <div class="twocol">
      <div class="field">
        <label for="anfitriao-nome"><span class="small">Nome</span></label>
        <input id="anfitriao-nome" data-bind="evento.anfitriao.nome" type="text" />
      </div>
      <div class="field">
        <label for="anfitriao-telefone"><span class="small">Telefone</span></label>
        <input id="anfitriao-telefone" data-bind="evento.anfitriao.telefone" type="text" />
      </div>
    </div>

    <div class="field">
      <label for="anfitriao-rede"><span class="small">Rede social / contato</span></label>
      <input id="anfitriao-rede" data-bind="evento.anfitriao.redeSocial" type="text" />
    </div>

    <div><strong class="small">Endereço para correspondência</strong></div>

    <div class="twocol">
      <div class="field">
        <label for="correspondencia-cep"><span class="small">CEP</span></label>
        <input
          id="correspondencia-cep"
          data-bind="evento.anfitriao.endCorrespondencia.cep"
          type="text"
          inputmode="numeric"
          maxlength="9"
          data-cep="evento.anfitriao.endCorrespondencia"
        />
      </div>
      <div class="field">
        <label for="correspondencia-logradouro"><span class="small">Logradouro</span></label>
        <input id="correspondencia-logradouro" data-bind="evento.anfitriao.endCorrespondencia.logradouro" type="text" />
      </div>
    </div>

    <div class="threecol">
      <div class="field">
        <label for="correspondencia-numero"><span class="small">Número</span></label>
        <input id="correspondencia-numero" data-bind="evento.anfitriao.endCorrespondencia.numero" type="text" />
      </div>
      <div class="field">
        <label for="correspondencia-bairro"><span class="small">Bairro</span></label>
        <input id="correspondencia-bairro" data-bind="evento.anfitriao.endCorrespondencia.bairro" type="text" />
      </div>
      <div class="field">
        <label for="correspondencia-cidade"><span class="small">Cidade</span></label>
        <input id="correspondencia-cidade" data-bind="evento.anfitriao.endCorrespondencia.cidade" type="text" />
      </div>
    </div>

    <div class="twocol">
      <div class="field">
        <label for="correspondencia-uf"><span class="small">UF</span></label>
        <input id="correspondencia-uf" data-bind="evento.anfitriao.endCorrespondencia.uf" type="text" maxlength="2" />
      </div>
      <div class="field">
        <label for="correspondencia-complemento"><span class="small">Complemento</span></label>
        <input id="correspondencia-complemento" data-bind="evento.anfitriao.endCorrespondencia.complemento" type="text" />
      </div>
    </div>

    <div><strong class="small">Endereço para entrega de presentes</strong></div>

    <div class="twocol">
      <div class="field">
        <label for="entrega-cep"><span class="small">CEP</span></label>
        <input
          id="entrega-cep"
          data-bind="evento.anfitriao.endEntrega.cep"
          type="text"
          inputmode="numeric"
          maxlength="9"
          data-cep="evento.anfitriao.endEntrega"
        />
      </div>
      <div class="field">
        <label for="entrega-logradouro"><span class="small">Logradouro</span></label>
        <input id="entrega-logradouro" data-bind="evento.anfitriao.endEntrega.logradouro" type="text" />
      </div>
    </div>

    <div class="threecol">
      <div class="field">
        <label for="entrega-numero"><span class="small">Número</span></label>
        <input id="entrega-numero" data-bind="evento.anfitriao.endEntrega.numero" type="text" />
      </div>
      <div class="field">
        <label for="entrega-bairro"><span class="small">Bairro</span></label>
        <input id="entrega-bairro" data-bind="evento.anfitriao.endEntrega.bairro" type="text" />
      </div>
      <div class="field">
        <label for="entrega-cidade"><span class="small">Cidade</span></label>
        <input id="entrega-cidade" data-bind="evento.anfitriao.endEntrega.cidade" type="text" />
      </div>
    </div>

    <div class="twocol">
      <div class="field">
        <label for="entrega-uf"><span class="small">UF</span></label>
        <input id="entrega-uf" data-bind="evento.anfitriao.endEntrega.uf" type="text" maxlength="2" />
      </div>
      <div class="field">
        <label for="entrega-complemento"><span class="small">Complemento</span></label>
        <input id="entrega-complemento" data-bind="evento.anfitriao.endEntrega.complemento" type="text" />
      </div>
    </div>

    <div class="close-hint">Pressione <strong>Esc</strong> ou clique no lápis novamente para fechar.</div>
  </div>
</details>

<details id="secCerimonial">
  <summary>Cerimonialista</summary>
  <div class="details-wrap">
    <div class="twocol">
      <div class="field">
        <label for="cerimonial-nome"><span class="small">Nome</span></label>
        <input id="cerimonial-nome" data-bind="cerimonialista.nomeCompleto" type="text" />
      </div>
      <div class="field">
        <label for="cerimonial-telefone"><span class="small">Telefone</span></label>
        <input id="cerimonial-telefone" data-bind="cerimonialista.telefone" type="text" />
      </div>
    </div>

    <div class="field">
      <label for="cerimonial-rede"><span class="small">Rede social</span></label>
      <input id="cerimonial-rede" data-bind="cerimonialista.redeSocial" type="text" />
    </div>

    <div class="close-hint">Pressione <strong>Esc</strong> ou clique no lápis novamente para fechar.</div>
  </div>
</details>
