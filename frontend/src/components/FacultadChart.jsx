import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';

export default function FacultadChart({ dataFromApi }) {
  const labels = dataFromApi.map(item => item.facultad);
  const values = dataFromApi.map(item => item.total_estudiantes);

  const data = {
    labels,
    datasets: [
      {
        label: 'Estudiantes matriculados',
        data: values,
        backgroundColor: '#3b82f6'
      }
    ]
  };

  const options = {
    indexAxis: 'x', // 
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Estudiantes por Facultad (2024-2)' }
    }
  };

  return <Bar data={data} options={options} />;
}

