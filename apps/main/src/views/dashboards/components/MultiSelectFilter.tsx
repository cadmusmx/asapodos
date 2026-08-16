'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import type { SelectChangeEvent } from '@mui/material/Select'

type CatalogItems = Array<{ id: number; nombre: string }>
type StaticOption = { value: string; label: string }

type Option =
  | { source: 'catalog'; items: CatalogItems }
  | { source: 'static'; items: StaticOption[] }

type MultiSelectFilterProps = {
  label: string
  optionType: Option
  value: string[]
  onChange: (val: string[]) => void
  emptyText?: string
}

const MultiSelectFilter = ({ label, optionType, value, onChange, emptyText = 'Sin opciones' }: MultiSelectFilterProps) => {
  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const val = event.target.value as string[]
    onChange(val.filter((v) => v !== ''))
  }

  const renderValue = (selected: string[]) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {selected.map((v) => {
        let display = v
        if (optionType.source === 'catalog') {
          const opt = optionType.items.find((o) => String(o.id) === v)
          display = opt ? opt.nombre : v
        } else {
          const opt = optionType.items.find((o) => o.value === v)
          display = opt ? opt.label : v
        }
        const truncated = display.length > 15 ? display.substring(0, 15) + '...' : display
        return (
          <Chip
            key={v}
            label={truncated}
            size='small'
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )
      })}
    </Box>
  )

  const renderItems = () => {
    if (optionType.source === 'catalog') {
      if (optionType.items.length === 0) {
        return <MenuItem disabled>{emptyText}</MenuItem>
      }
      return optionType.items.map((opt) => (
        <MenuItem key={opt.id} value={String(opt.id)}>
          {opt.nombre}
        </MenuItem>
      ))
    }
    return optionType.items.map((opt) => (
      <MenuItem key={opt.value} value={opt.value}>
        {opt.label}
      </MenuItem>
    ))
  }

  return (
    <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', minHeight: 40 } }}>
      <InputLabel sx={{ fontSize: '0.85rem', top: -6 }}>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={handleChange}
        label={label}
        inputProps={{ sx: { py: 0.75 } }}
        renderValue={renderValue}
        MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
      >
        {renderItems()}
      </Select>
    </FormControl>
  )
}

export default MultiSelectFilter
