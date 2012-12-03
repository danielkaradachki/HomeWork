using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.ComponentModel.DataAnnotations;

namespace GridInLineEditing.Models
{
    public class ProductViewModel
    {
        public int ProductID { get; set; }

        [Required]
        [StringLength(40)]
        public string ProductName { get; set; }

        public int? CategoryID { get; set; }

        [Range(1, 100)]
        public decimal? UnitPrice { get; set; }

        public void CopyToProduct(Product product)
        {
            product.ProductName = this.ProductName;
            product.CategoryID = this.CategoryID;
            product.UnitPrice = this.UnitPrice;
        }
    }
}