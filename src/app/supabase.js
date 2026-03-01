import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pwpwufluyjybmncqamui.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cHd1Zmx1eWp5Ym1uY3FhbXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDYzMjMsImV4cCI6MjA4Nzg4MjMyM30.IjgcVaj5FhoS5Op6B0qjHviV7RvimCiiMY_IgYCF-qA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
