export const state = () => ({
  pj: '',
  aventura: '',
  valor: 'Dj'
})

export const mutations = {
  loadPj(state, pj) {
    state.pj = pj
  },
  loadAventura(state, aventura) {
    state.aventura = aventura
  }
}

export const getters = {
  getPj: (state) => state.pj,
  getAventura: (state) => state.aventura
}
