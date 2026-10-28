import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import Presenter from './components/Presenter.svelte'

const params = new URLSearchParams(location.search)
const isPresenter = params.get('presenter') !== null

const target = document.getElementById('app')
mount(isPresenter ? Presenter : App, { target })
