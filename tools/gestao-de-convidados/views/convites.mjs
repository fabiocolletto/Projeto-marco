// tools/gestao-de-convidados/views/convites.mjs
import { higienizarLinha, higienizarLista } from '../../../shared/higienizarLista.mjs';

export async function render(root, ctx){
  const project = await ctx.store.getProject(ctx.projectId);
  const lista = Array.isArray(project.lista) ? project.lista : [];
  root.innerHTML = `
    <section class="ac-section-block">
      <h3>Convites</h3>
      <div class="ac-grid-2">
        <div class="ac-card">
          <h4>Adicionar vários (colar)</h4>
          <textarea id="ac-paste" rows="4" placeholder="Uma linha por convite: Nome(s) | Telefone"></textarea>
          <div class="ac-actions"><button id="ac-import">Higienizar & Adicionar</button></div>
        </div>
        <div class="ac-card">
          <h4>Adicionar um</h4>
          <div class="ac-form-row">
            <input id="single-nome" placeholder="Nome(s)"/>
            <input id="single-tel" placeholder="Telefone"/>
            <button id="single-add">Adicionar</button>
          </div>
        </div>
      </div>
      <div class="ac-table-wrap">
        <table class="ac-table">
          <thead>
            <tr>
              <th>Convidado</th><th>Telefone</th><th>Total</th>
              <th>Enviado?</th><th>Enviado em</th>
              <th>RSVP</th><th>Confirmados</th><th>Ações</th>
            </tr>
          </thead>
          <tbody id="ac-rows"></tbody>
        </table>
      </div>
    </section>
    <div id="drawer" class="ac-drawer" hidden></div>
  `;
  const tbody = root.querySelector('#ac-rows');
  lista.forEach(item => tbody.appendChild(row(item)));

  root.querySelector('#ac-import').addEventListener('click', async () => {
    const txt = root.querySelector('#ac-paste').value.trim();
    if(!txt) return;
    const res = txt.includes('\n') ? higienizarLista(txt) : { convidados: [ higienizarLinha(txt) ] };
    const p = await ctx.store.getProject(ctx.projectId);
    const now = Date.now();
    const novos = res.convidados.map(g => ({
      id: crypto.randomUUID(),
      envio: { enviado:false, enviadoEm:null, modeloId:null },
      rsvp: { status:'pendente', confirmadosN:0, confirmadosNomes:[], observacao:'', atualizadoEm:now },
      ...g
    }));
    const listaNova = [...(p.lista||[]), ...novos];
    await ctx.store.updateProject(ctx.projectId, { lista: listaNova });
    novos.forEach(n => tbody.appendChild(row(n)));
    root.querySelector('#ac-paste').value='';
  });

  root.querySelector('#single-add').addEventListener('click', async () => {
    const nome = root.querySelector('#single-nome').value.trim();
    const tel  = root.querySelector('#single-tel').value.trim();
    if(!nome && !tel) return;
    const item = higienizarLinha(`${nome} | ${tel}`);
    const p = await ctx.store.getProject(ctx.projectId);
    const novo = {
      id: crypto.randomUUID(),
      envio: { enviado:false, enviadoEm:null, modeloId:null },
      rsvp: { status:'pendente', confirmadosN:0, confirmadosNomes:[], observacao:'', atualizadoEm:Date.now() },
      ...item
    };
    const listaNova = [...(p.lista||[]), novo];
    await ctx.store.updateProject(ctx.projectId, { lista: listaNova });
    tbody.appendChild(row(novo));
    root.querySelector('#single-nome').value='';
    root.querySelector('#single-tel').value='';
  });

  // Delegação de eventos na tabela
  tbody.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const tr = btn.closest('tr');
    const id = tr.dataset.id;
    const proj = await ctx.store.getProject(ctx.projectId);
    const idx = (proj.lista||[]).findIndex(x => x.id === id);
    if (idx < 0) return;
    const item = proj.lista[idx];

    if (btn.dataset.action === 'editar'){
      openDrawer(root.querySelector('#drawer'), item, async (next)=>{
        proj.lista[idx] = next;
        await ctx.store.updateProject(ctx.projectId, { lista: proj.lista });
        tr.replaceWith(row(next));
      });
    }
    if (btn.dataset.action === 'confirmar'){
      item.rsvp.confirmadosN = item.totalConvite;
      item.rsvp.confirmadosNomes = [item.principal, ...(item.acompanhantesNomes||[])].filter(Boolean);
      item.rsvp.status = 'confirmado_total';
      item.rsvp.atualizadoEm = Date.now();
      proj.lista[idx] = item;
      await ctx.store.updateProject(ctx.projectId, { lista: proj.lista });
      tr.replaceWith(row(item));
    }
    if (btn.dataset.action === 'ausente'){
      item.rsvp.confirmadosN = 0;
      item.rsvp.confirmadosNomes = [];
      item.rsvp.status = 'ausente';
      item.rsvp.atualizadoEm = Date.now();
      proj.lista[idx] = item;
      await ctx.store.updateProject(ctx.projectId, { lista: proj.lista });
      tr.replaceWith(row(item));
    }
    if (btn.dataset.action === 'enviar'){
      item.envio.enviado = true;
      item.envio.enviadoEm = Date.now();
      proj.lista[idx] = item;
      await ctx.store.updateProject(ctx.projectId, { lista: proj.lista });
      tr.replaceWith(row(item));
    }
    if (btn.dataset.action === 'excluir'){
      if (!confirm('Excluir este convite?')) return;
      proj.lista.splice(idx,1);
      await ctx.store.updateProject(ctx.projectId, { lista: proj.lista });
      tr.remove();
    }
  });
}

function row(item){
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;
  const enviadoEm = item.envio?.enviadoEm ? new Date(item.envio.enviadoEm).toLocaleString() : '-';
  const rsvp = item.rsvp?.status || 'pendente';
  const conf = item.rsvp?.confirmadosN ?? 0;
  tr.innerHTML = `
    <td>${item.nome}</td>
    <td>${item.telefoneFormatado || item.telefone || '-'}</td>
    <td>${item.totalConvite}</td>
    <td>${item.envio?.enviado ? 'Sim' : 'Não'}</td>
    <td>${enviadoEm}</td>
    <td><span class="ac-badge ac-badge--${rsvp}">${rsvp.replace('_',' ')}</span></td>
    <td>${conf}/${item.totalConvite}</td>
    <td class="ac-actions-col">
      <button data-action="editar">Editar</button>
      <button data-action="confirmar">Confirmar todos</button>
      <button data-action="ausente">Ausente</button>
      <button data-action="enviar">Marcar enviado</button>
      <button data-action="excluir" class="ac-danger">Excluir</button>
    </td>
  `;
  return tr;
}

function openDrawer(host, item, onSave){
  host.hidden = false;
  const nomes = [item.principal, ...(item.acompanhantesNomes||[])].filter(Boolean);
  const checks = nomes.map(n => {
    const checked = item.rsvp.confirmadosNomes?.includes(n) ? 'checked' : '';
    return `<label><input type="checkbox" data-name="${n}" ${checked}/> ${n}</label>`;
  }).join('') || '<em>Sem nomes de acompanhantes — use o seletor numérico.</em>';
  const numOptions = Array.from({length:item.totalConvite+1}, (_,i)=>`<option value="${i}" ${i===item.rsvp.confirmadosN?'selected':''}>${i}</option>`).join('');
  host.innerHTML = `
    <div class="ac-drawer__overlay"></div>
    <div class="ac-drawer__panel">
      <header class="ac-drawer__header">
        <h4>Editar convite</h4>
        <button id="close">×</button>
      </header>
      <div class="ac-drawer__content">
        <div class="ac-form-grid">
          <label>Nome(s) <input id="f-nome" value="${item.nome}"/></label>
          <label>Telefone <input id="f-tel" value="${item.telefone || ''}" placeholder="Ex.: +55 41 99999-0000"/></label>
          <label>Total do convite <input id="f-total" type="number" min="1" value="${item.totalConvite}"/></label>
        </div>
        <fieldset class="ac-fieldset">
          <legend>RSVP</legend>
          <div class="ac-rsvp">
            <div class="ac-rsvp__names">${checks}</div>
            <div class="ac-rsvp__count">
              <label>Confirmados (número)
                <select id="f-conf">${numOptions}</select>
              </label>
            </div>
            <label>Observação <input id="f-obs" value="${item.rsvp?.observacao||''}"/></label>
          </div>
        </fieldset>
        <fieldset class="ac-fieldset">
          <legend>Envio</legend>
          <label><input type="checkbox" id="f-enviado" ${item.envio?.enviado?'checked':''}/> Mensagem enviada</label>
          <label>Modelo <input id="f-modelo" value="${item.envio?.modeloId||''}" placeholder="Opcional: id do modelo"/></label>
        </fieldset>
      </div>
      <footer class="ac-drawer__footer">
        <button id="save" class="ac-primary">Salvar alterações</button>
        <button id="cancel">Cancelar</button>
      </footer>
    </div>
  `;
  const close = ()=>{ host.hidden = true; host.innerHTML=''; };
  host.querySelector('#close').onclick = close;
  host.querySelector('.ac-drawer__overlay').onclick = close;
  host.querySelector('#cancel').onclick = close;
  host.querySelector('#save').onclick = async ()=>{
    const next = structuredClone(item);
    next.nome = host.querySelector('#f-nome').value.trim() || item.nome;
    next.telefone = host.querySelector('#f-tel').value.trim() || item.telefone;
    next.totalConvite = Math.max(1, parseInt(host.querySelector('#f-total').value||item.totalConvite,10));
    // RSVP via nomes marcados (quando houver) OU seletor numérico
    const marked = Array.from(host.querySelectorAll('.ac-rsvp__names input[type=checkbox]:checked')).map(i=>i.dataset.name);
    const confByNames = marked.length > 0;
    next.rsvp = next.rsvp || {};
    next.rsvp.confirmadosNomes = confByNames ? marked : [];
    next.rsvp.confirmadosN = confByNames ? marked.length : parseInt(host.querySelector('#f-conf').value,10);
    next.rsvp.status = next.rsvp.confirmadosN === 0 ? 'ausente' : (next.rsvp.confirmadosN === next.totalConvite ? 'confirmado_total' : 'confirmado_parcial');
    next.rsvp.observacao = host.querySelector('#f-obs').value.trim();
    next.rsvp.atualizadoEm = Date.now();
    // Envio
    next.envio = next.envio || {};
    next.envio.enviado = host.querySelector('#f-enviado').checked;
    next.envio.enviadoEm = next.envio.enviado ? (next.envio.enviadoEm || Date.now()) : null;
    next.envio.modeloId = host.querySelector('#f-modelo').value.trim() || null;
    await onSave(next);
    close();
  };
}

export function destroy(){} 
